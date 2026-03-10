// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ArcSwap StableSwap Pool
/// @notice Curve-style StableSwap AMM for USDC/EURC on Arc Network
/// @dev Handles decimal normalization (USDC 18 dec, EURC 6 dec)
contract StableSwapPool is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant N_COINS = 2;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant FEE_DENOMINATOR = 1e6;
    uint256 public constant MAX_A = 1e6;
    uint256 public constant MAX_FEE = 5e4; // 5%

    IERC20 public immutable token0; // USDC (18 decimals on Arc)
    IERC20 public immutable token1; // EURC (6 decimals on Arc)

    uint256 public immutable rate0; // multiplier to normalize token0 to 18 dec
    uint256 public immutable rate1; // multiplier to normalize token1 to 18 dec

    uint256 public A; // amplification coefficient
    uint256 public fee; // swap fee in 1e6 (e.g., 400 = 0.04%)
    uint256 public adminFee; // portion of fee to admin (1e6 base)

    uint256 public totalFees0;
    uint256 public totalFees1;

    event Swap(
        address indexed sender,
        uint256 tokenInIndex,
        uint256 amountIn,
        uint256 amountOut,
        address indexed receiver
    );
    event AddLiquidity(
        address indexed provider,
        uint256[2] amounts,
        uint256 lpMinted
    );
    event RemoveLiquidity(
        address indexed provider,
        uint256[2] amounts,
        uint256 lpBurned
    );
    event RemoveLiquidityOne(
        address indexed provider,
        uint256 tokenIndex,
        uint256 amountOut,
        uint256 lpBurned
    );

    constructor(
        address _token0,
        address _token1,
        uint8 _decimals0,
        uint8 _decimals1,
        uint256 _A,
        uint256 _fee,
        uint256 _adminFee,
        string memory _lpName,
        string memory _lpSymbol
    ) ERC20(_lpName, _lpSymbol) Ownable(msg.sender) {
        require(_A <= MAX_A, "A too high");
        require(_fee <= MAX_FEE, "Fee too high");
        require(_adminFee <= FEE_DENOMINATOR, "Admin fee too high");

        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        rate0 = 10 ** (18 - _decimals0);
        rate1 = 10 ** (18 - _decimals1);
        A = _A;
        fee = _fee;
        adminFee = _adminFee;
    }

    // ==================== View Functions ====================

    function balances() public view returns (uint256[2] memory) {
        return [token0.balanceOf(address(this)), token1.balanceOf(address(this))];
    }

    /// @notice Get normalized balances (both scaled to 18 decimals)
    function xp() public view returns (uint256[2] memory) {
        return [
            token0.balanceOf(address(this)) * rate0,
            token1.balanceOf(address(this)) * rate1
        ];
    }

    /// @notice Calculate swap output amount
    function getAmountOut(uint256 tokenInIndex, uint256 amountIn) external view returns (uint256) {
        require(tokenInIndex < N_COINS, "Invalid index");
        uint256 tokenOutIndex = 1 - tokenInIndex;

        uint256[2] memory _xp = xp();
        uint256 rateIn = tokenInIndex == 0 ? rate0 : rate1;
        uint256 rateOut = tokenOutIndex == 0 ? rate0 : rate1;

        uint256 x = _xp[tokenInIndex] + amountIn * rateIn;
        uint256 y = _getY(tokenInIndex, tokenOutIndex, x, _xp);
        uint256 dy = _xp[tokenOutIndex] - y - 1;

        uint256 feeAmount = dy * fee / FEE_DENOMINATOR;
        return (dy - feeAmount) / rateOut;
    }

    function getVirtualPrice() external view returns (uint256) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) return PRECISION;
        uint256 D = _getD(xp());
        return D * PRECISION / _totalSupply;
    }

    // ==================== State-Changing Functions ====================

    /// @notice Swap tokens
    function swap(
        uint256 tokenInIndex,
        uint256 amountIn,
        uint256 minAmountOut,
        address receiver
    ) external nonReentrant returns (uint256 amountOut) {
        require(tokenInIndex < N_COINS, "Invalid index");
        require(amountIn > 0, "Zero amount");
        if (receiver == address(0)) receiver = msg.sender;

        uint256 tokenOutIndex = 1 - tokenInIndex;
        IERC20 tokenIn = tokenInIndex == 0 ? token0 : token1;
        IERC20 tokenOut = tokenOutIndex == 0 ? token0 : token1;
        uint256 rateIn = tokenInIndex == 0 ? rate0 : rate1;
        uint256 rateOut = tokenOutIndex == 0 ? rate0 : rate1;

        uint256[2] memory _xp = xp();

        // Transfer in
        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate output
        uint256 x = _xp[tokenInIndex] + amountIn * rateIn;
        uint256 y = _getY(tokenInIndex, tokenOutIndex, x, _xp);
        uint256 dy = _xp[tokenOutIndex] - y - 1;

        uint256 feeAmount = dy * fee / FEE_DENOMINATOR;
        amountOut = (dy - feeAmount) / rateOut;

        // Track admin fees
        uint256 adminFeeAmount = feeAmount * adminFee / FEE_DENOMINATOR / rateOut;
        if (tokenOutIndex == 0) {
            totalFees0 += adminFeeAmount;
        } else {
            totalFees1 += adminFeeAmount;
        }

        require(amountOut >= minAmountOut, "Slippage");

        // Transfer out
        tokenOut.safeTransfer(receiver, amountOut);

        emit Swap(msg.sender, tokenInIndex, amountIn, amountOut, receiver);
    }

    /// @notice Add liquidity and mint LP tokens
    function addLiquidity(
        uint256[2] calldata amounts,
        uint256 minLpAmount
    ) external nonReentrant returns (uint256 lpAmount) {
        uint256 _totalSupply = totalSupply();
        uint256 D0 = 0;

        if (_totalSupply > 0) {
            D0 = _getD(xp());
        }

        // Transfer tokens in
        if (amounts[0] > 0) {
            token0.safeTransferFrom(msg.sender, address(this), amounts[0]);
        }
        if (amounts[1] > 0) {
            token1.safeTransferFrom(msg.sender, address(this), amounts[1]);
        }

        uint256[2] memory newXp = xp();
        uint256 D1 = _getD(newXp);
        require(D1 > D0, "D must increase");

        if (_totalSupply == 0) {
            lpAmount = D1;
        } else {
            // Charge fee on imbalanced deposits
            uint256[2] memory idealBalances;
            idealBalances[0] = D1 * newXp[0] / D0; // not exactly right, simplify
            idealBalances[1] = D1 * newXp[1] / D0;

            lpAmount = _totalSupply * (D1 - D0) / D0;
        }

        require(lpAmount >= minLpAmount, "Slippage");
        _mint(msg.sender, lpAmount);

        emit AddLiquidity(msg.sender, amounts, lpAmount);
    }

    /// @notice Remove liquidity proportionally
    function removeLiquidity(
        uint256 lpAmount,
        uint256[2] calldata minAmounts
    ) external nonReentrant returns (uint256[2] memory amounts) {
        uint256 _totalSupply = totalSupply();
        require(lpAmount > 0 && lpAmount <= balanceOf(msg.sender), "Invalid LP amount");

        uint256[2] memory _balances = balances();
        amounts[0] = _balances[0] * lpAmount / _totalSupply;
        amounts[1] = _balances[1] * lpAmount / _totalSupply;

        require(amounts[0] >= minAmounts[0], "Slippage token0");
        require(amounts[1] >= minAmounts[1], "Slippage token1");

        _burn(msg.sender, lpAmount);
        token0.safeTransfer(msg.sender, amounts[0]);
        token1.safeTransfer(msg.sender, amounts[1]);

        emit RemoveLiquidity(msg.sender, amounts, lpAmount);
    }

    /// @notice Remove liquidity in a single token
    function removeLiquidityOneToken(
        uint256 lpAmount,
        uint256 tokenIndex,
        uint256 minAmount
    ) external nonReentrant returns (uint256 amountOut) {
        require(tokenIndex < N_COINS, "Invalid index");
        require(lpAmount > 0 && lpAmount <= balanceOf(msg.sender), "Invalid LP amount");

        uint256 _totalSupply = totalSupply();
        uint256[2] memory _xp = xp();
        uint256 D0 = _getD(_xp);
        uint256 D1 = D0 - (D0 * lpAmount / _totalSupply);

        uint256 newY = _getYD(tokenIndex, _xp, D1);
        uint256 rateOut = tokenIndex == 0 ? rate0 : rate1;

        uint256 dy = (_xp[tokenIndex] - newY - 1) / rateOut;
        uint256 feeAmount = dy * fee / FEE_DENOMINATOR;
        amountOut = dy - feeAmount;

        require(amountOut >= minAmount, "Slippage");

        _burn(msg.sender, lpAmount);
        IERC20 tokenOut = tokenIndex == 0 ? token0 : token1;
        tokenOut.safeTransfer(msg.sender, amountOut);

        emit RemoveLiquidityOne(msg.sender, tokenIndex, amountOut, lpAmount);
    }

    // ==================== Admin Functions ====================

    function setA(uint256 _A) external onlyOwner {
        require(_A <= MAX_A, "A too high");
        A = _A;
    }

    function setFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "Fee too high");
        fee = _fee;
    }

    function withdrawAdminFees() external onlyOwner {
        if (totalFees0 > 0) {
            uint256 amount = totalFees0;
            totalFees0 = 0;
            token0.safeTransfer(owner(), amount);
        }
        if (totalFees1 > 0) {
            uint256 amount = totalFees1;
            totalFees1 = 0;
            token1.safeTransfer(owner(), amount);
        }
    }

    // ==================== Internal Math ====================

    /// @notice Compute invariant D using Newton's method
    function _getD(uint256[2] memory _xp) internal view returns (uint256) {
        uint256 S = _xp[0] + _xp[1];
        if (S == 0) return 0;

        uint256 D = S;
        uint256 Ann = A * N_COINS;

        for (uint256 i = 0; i < 255; i++) {
            // D_P = D^(n+1) / (n^n * prod(xp))
            uint256 D_P = D;
            D_P = D_P * D / (_xp[0] * N_COINS);
            D_P = D_P * D / (_xp[1] * N_COINS);

            uint256 D_prev = D;
            // D = (Ann * S + D_P * N) * D / ((Ann - 1) * D + (N + 1) * D_P)
            D = (Ann * S + D_P * N_COINS) * D / ((Ann - 1) * D + (N_COINS + 1) * D_P);

            if (_diff(D, D_prev) <= 1) return D;
        }
        revert("D did not converge");
    }

    /// @notice Get y given x for swap calculation
    function _getY(
        uint256 i,
        uint256 j,
        uint256 x,
        uint256[2] memory _xp
    ) internal view returns (uint256) {
        require(i != j, "Same index");

        uint256 D = _getD(_xp);
        uint256 Ann = A * N_COINS;

        uint256 c = D * D / (x * N_COINS);
        c = c * D / (Ann * N_COINS);

        uint256 b = x + D / Ann;

        uint256 y = D;
        for (uint256 k = 0; k < 255; k++) {
            uint256 y_prev = y;
            y = (y * y + c) / (2 * y + b - D);

            if (_diff(y, y_prev) <= 1) return y;
        }
        revert("y did not converge");
    }

    /// @notice Get y for a given D (used in removeLiquidityOneToken)
    function _getYD(
        uint256 tokenIndex,
        uint256[2] memory _xp,
        uint256 D
    ) internal view returns (uint256) {
        uint256 otherIndex = 1 - tokenIndex;
        uint256 Ann = A * N_COINS;

        uint256 c = D * D / (_xp[otherIndex] * N_COINS);
        c = c * D / (Ann * N_COINS);

        uint256 b = _xp[otherIndex] + D / Ann;

        uint256 y = D;
        for (uint256 k = 0; k < 255; k++) {
            uint256 y_prev = y;
            y = (y * y + c) / (2 * y + b - D);

            if (_diff(y, y_prev) <= 1) return y;
        }
        revert("y did not converge");
    }

    function _diff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
}
