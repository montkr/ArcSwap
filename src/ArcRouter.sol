// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./StableSwapPool.sol";

/// @title ArcSwap Router
/// @notice Convenience router for ArcSwap operations with deadline protection
contract ArcRouter {
    using SafeERC20 for IERC20;

    StableSwapPool public immutable pool;
    IERC20 public immutable token0;
    IERC20 public immutable token1;

    error Expired();

    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert Expired();
        _;
    }

    constructor(address _pool) {
        pool = StableSwapPool(_pool);
        token0 = pool.token0();
        token1 = pool.token1();
    }

    /// @notice Swap with deadline protection
    function swap(
        uint256 tokenInIndex,
        uint256 amountIn,
        uint256 minAmountOut,
        address receiver,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        IERC20 tokenIn = tokenInIndex == 0 ? token0 : token1;
        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);
        tokenIn.safeIncreaseAllowance(address(pool), amountIn);
        amountOut = pool.swap(tokenInIndex, amountIn, minAmountOut, receiver);
    }

    /// @notice Add liquidity with deadline protection
    function addLiquidity(
        uint256[2] calldata amounts,
        uint256 minLpAmount,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 lpAmount) {
        if (amounts[0] > 0) {
            token0.safeTransferFrom(msg.sender, address(this), amounts[0]);
            token0.safeIncreaseAllowance(address(pool), amounts[0]);
        }
        if (amounts[1] > 0) {
            token1.safeTransferFrom(msg.sender, address(this), amounts[1]);
            token1.safeIncreaseAllowance(address(pool), amounts[1]);
        }

        lpAmount = pool.addLiquidity(amounts, minLpAmount);

        // Transfer LP tokens to the user
        IERC20(address(pool)).safeTransfer(msg.sender, lpAmount);
    }
}
