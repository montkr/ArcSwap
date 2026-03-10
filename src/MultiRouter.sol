// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StableSwapPool.sol";

/// @title ArcSwap Multi-Pool Router
/// @notice Routes swaps through the best pool, supports multi-hop
contract MultiRouter is Ownable {
    using SafeERC20 for IERC20;

    struct PoolInfo {
        StableSwapPool pool;
        address token0;
        address token1;
    }

    PoolInfo[] public pools;

    // token pair hash => pool index (for direct lookup)
    mapping(bytes32 => uint256[]) public pairToPools;

    error Expired();
    error NoRoute();

    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert Expired();
        _;
    }

    constructor() Ownable(msg.sender) {}

    /// @notice Register a pool
    function addPool(address _pool) external onlyOwner {
        StableSwapPool pool = StableSwapPool(_pool);
        address t0 = address(pool.token0());
        address t1 = address(pool.token1());

        uint256 idx = pools.length;
        pools.push(PoolInfo({ pool: pool, token0: t0, token1: t1 }));

        pairToPools[_pairKey(t0, t1)].push(idx);
        pairToPools[_pairKey(t1, t0)].push(idx);
    }

    /// @notice Get number of registered pools
    function poolCount() external view returns (uint256) {
        return pools.length;
    }

    /// @notice Get best direct quote for a swap
    function getBestQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (uint256 bestAmountOut, uint256 bestPoolIdx) {
        uint256[] storage poolIdxs = pairToPools[_pairKey(tokenIn, tokenOut)];
        bestAmountOut = 0;
        bestPoolIdx = type(uint256).max;

        for (uint256 i = 0; i < poolIdxs.length; i++) {
            PoolInfo storage info = pools[poolIdxs[i]];
            uint256 tokenInIndex = address(info.token0) == tokenIn ? 0 : 1;
            try info.pool.getAmountOut(tokenInIndex, amountIn) returns (uint256 out) {
                if (out > bestAmountOut) {
                    bestAmountOut = out;
                    bestPoolIdx = poolIdxs[i];
                }
            } catch {}
        }
    }

    /// @notice Get quote for multi-hop path
    function getMultiHopQuote(
        address[] calldata path,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256[] memory poolIdxs) {
        require(path.length >= 2, "Path too short");
        poolIdxs = new uint256[](path.length - 1);
        amountOut = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            (uint256 out, uint256 idx) = getBestQuote(path[i], path[i + 1], amountOut);
            if (idx == type(uint256).max) revert NoRoute();
            amountOut = out;
            poolIdxs[i] = idx;
        }
    }

    /// @notice Swap through the best single pool
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address receiver,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        (, uint256 poolIdx) = getBestQuote(tokenIn, tokenOut, amountIn);
        if (poolIdx == type(uint256).max) revert NoRoute();

        PoolInfo storage info = pools[poolIdx];
        uint256 tokenInIndex = address(info.token0) == tokenIn ? 0 : 1;

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(address(info.pool), amountIn);

        amountOut = info.pool.swap(tokenInIndex, amountIn, minAmountOut, receiver);
    }

    /// @notice Multi-hop swap through path
    function swapMultiHop(
        address[] calldata path,
        uint256 amountIn,
        uint256 minAmountOut,
        address receiver,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        require(path.length >= 2, "Path too short");

        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        amountOut = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            (, uint256 poolIdx) = getBestQuote(path[i], path[i + 1], amountOut);
            if (poolIdx == type(uint256).max) revert NoRoute();

            PoolInfo storage info = pools[poolIdx];
            uint256 tokenInIndex = address(info.token0) == path[i] ? 0 : 1;

            IERC20(path[i]).safeIncreaseAllowance(address(info.pool), amountOut);

            // Last hop sends to receiver, intermediates to this contract
            address target = (i == path.length - 2) ? receiver : address(this);
            amountOut = info.pool.swap(tokenInIndex, amountOut, 0, target);
        }

        require(amountOut >= minAmountOut, "Slippage");
    }

    function _pairKey(address a, address b) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(a, b));
    }
}
