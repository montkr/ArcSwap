// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/StableSwapPool.sol";
import "../src/ArcVault.sol";
import "../src/ArcRouter.sol";
import "../src/MultiRouter.sol";

contract DeployArcSwap is Script {
    // Arc Testnet addresses
    address constant USDC = 0x3600000000000000000000000000000000000000;
    address constant EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
    address constant USYC = 0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Deploy USDC/EURC Pool
        StableSwapPool poolUsdcEurc = new StableSwapPool(
            USDC, EURC, 6, 6, 100, 400, 500000,
            "ArcSwap USDC/EURC LP", "asLP-USDC-EURC"
        );
        console.log("Pool USDC/EURC:", address(poolUsdcEurc));

        // Deploy USDC/USYC Pool
        StableSwapPool poolUsdcUsyc = new StableSwapPool(
            USDC, USYC, 6, 6, 100, 400, 500000,
            "ArcSwap USDC/USYC LP", "asLP-USDC-USYC"
        );
        console.log("Pool USDC/USYC:", address(poolUsdcUsyc));

        // Deploy Vault (for USDC/EURC LP)
        ArcVault vault = new ArcVault(IERC20(address(poolUsdcEurc)));
        console.log("ArcVault:", address(vault));

        // Deploy MultiRouter
        MultiRouter multiRouter = new MultiRouter();
        multiRouter.addPool(address(poolUsdcEurc));
        multiRouter.addPool(address(poolUsdcUsyc));
        console.log("MultiRouter:", address(multiRouter));

        vm.stopBroadcast();
    }
}
