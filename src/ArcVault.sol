// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ArcSwap Vault
/// @notice ERC-4626 yield vault that wraps ArcSwap LP tokens
/// @dev Users deposit LP tokens and earn yield from swap fees
contract ArcVault is ERC4626, Ownable {
    constructor(
        IERC20 lpToken
    )
        ERC20("ArcSwap Vault Share", "avUSDC-EURC")
        ERC4626(lpToken)
        Ownable(msg.sender)
    {}

    /// @notice Total assets includes LP tokens held by this vault
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }
}
