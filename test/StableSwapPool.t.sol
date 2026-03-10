// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/StableSwapPool.sol";
import "../src/ArcVault.sol";
import "../src/ArcRouter.sol";
import "../src/MultiRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Mock ERC-20 for testing
contract MockToken is ERC20 {
    uint8 private _dec;

    constructor(string memory name, string memory symbol, uint8 dec_) ERC20(name, symbol) {
        _dec = dec_;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract StableSwapPoolTest is Test {
    StableSwapPool pool;
    StableSwapPool pool2; // USDC/USYC pool
    ArcVault vault;
    ArcRouter router;
    MultiRouter multiRouter;
    MockToken usdc; // 6 decimals
    MockToken eurc; // 6 decimals
    MockToken usyc; // 6 decimals

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant A = 100;
    uint256 constant FEE = 400; // 0.04%
    uint256 constant ADMIN_FEE = 500000; // 50% of fee

    function setUp() public {
        usdc = new MockToken("USDC", "USDC", 6);
        eurc = new MockToken("EURC", "EURC", 6);
        usyc = new MockToken("USYC", "USYC", 6);

        pool = new StableSwapPool(
            address(usdc),
            address(eurc),
            6,
            6,
            A,
            FEE,
            ADMIN_FEE,
            "ArcSwap USDC/EURC LP",
            "asLP-USDC-EURC"
        );

        pool2 = new StableSwapPool(
            address(usdc),
            address(usyc),
            6,
            6,
            A,
            FEE,
            ADMIN_FEE,
            "ArcSwap USDC/USYC LP",
            "asLP-USDC-USYC"
        );

        vault = new ArcVault(IERC20(address(pool)));
        router = new ArcRouter(address(pool));

        multiRouter = new MultiRouter();
        multiRouter.addPool(address(pool));
        multiRouter.addPool(address(pool2));

        // Mint tokens to alice and bob
        usdc.mint(alice, 1_000_000e6);
        eurc.mint(alice, 1_000_000e6);
        usyc.mint(alice, 1_000_000e6);
        usdc.mint(bob, 100_000e6);
        eurc.mint(bob, 100_000e6);
        usyc.mint(bob, 100_000e6);
    }

    // ==================== Add Liquidity Tests ====================

    function test_addLiquidity_initial() public {
        vm.startPrank(alice);
        usdc.approve(address(pool), type(uint256).max);
        eurc.approve(address(pool), type(uint256).max);

        uint256 lpAmount = pool.addLiquidity(
            [uint256(10_000e6), uint256(10_000e6)],
            0
        );

        assertGt(lpAmount, 0, "Should mint LP tokens");
        assertEq(pool.balanceOf(alice), lpAmount, "Alice should hold LP");
        vm.stopPrank();
    }

    function test_addLiquidity_subsequent() public {
        // Alice provides initial liquidity
        _addInitialLiquidity();

        // Bob adds more
        vm.startPrank(bob);
        usdc.approve(address(pool), type(uint256).max);
        eurc.approve(address(pool), type(uint256).max);

        uint256 lpBefore = pool.totalSupply();
        uint256 lpAmount = pool.addLiquidity(
            [uint256(1_000e6), uint256(1_000e6)],
            0
        );

        assertGt(lpAmount, 0, "Should mint LP for Bob");
        assertGt(pool.totalSupply(), lpBefore, "Total supply should increase");
        vm.stopPrank();
    }

    // ==================== Swap Tests ====================

    function test_swap_USDC_to_EURC() public {
        _addInitialLiquidity();

        vm.startPrank(bob);
        usdc.approve(address(pool), type(uint256).max);

        uint256 amountIn = 100e6; // 100 USDC
        uint256 eurcBefore = eurc.balanceOf(bob);

        uint256 amountOut = pool.swap(0, amountIn, 0, bob);

        uint256 eurcAfter = eurc.balanceOf(bob);
        assertEq(eurcAfter - eurcBefore, amountOut, "EURC received");
        assertGt(amountOut, 0, "Should receive EURC");
        assertGt(amountOut, 99e6, "Low slippage expected");
        vm.stopPrank();
    }

    function test_swap_EURC_to_USDC() public {
        _addInitialLiquidity();

        vm.startPrank(bob);
        eurc.approve(address(pool), type(uint256).max);

        uint256 amountIn = 100e6; // 100 EURC
        uint256 usdcBefore = usdc.balanceOf(bob);

        uint256 amountOut = pool.swap(1, amountIn, 0, bob);

        uint256 usdcAfter = usdc.balanceOf(bob);
        assertEq(usdcAfter - usdcBefore, amountOut, "USDC received");
        assertGt(amountOut, 99e6, "Low slippage expected");
        vm.stopPrank();
    }

    function test_swap_slippage_protection() public {
        _addInitialLiquidity();

        vm.startPrank(bob);
        usdc.approve(address(pool), type(uint256).max);

        // Set unreasonably high minAmountOut
        vm.expectRevert("Slippage");
        pool.swap(0, 100e6, 200e6, bob);
        vm.stopPrank();
    }

    function test_getAmountOut() public {
        _addInitialLiquidity();

        uint256 expected = pool.getAmountOut(0, 100e6);
        assertGt(expected, 99e6, "Preview should show low slippage");
    }

    // ==================== Remove Liquidity Tests ====================

    function test_removeLiquidity() public {
        _addInitialLiquidity();

        vm.startPrank(alice);
        uint256 lpBalance = pool.balanceOf(alice);
        uint256 halfLp = lpBalance / 4; // use 1/4 to be safe

        uint256 usdcBefore = usdc.balanceOf(alice);
        uint256 eurcBefore = eurc.balanceOf(alice);

        uint256[2] memory amounts = pool.removeLiquidity(halfLp, [uint256(0), uint256(0)]);

        assertGt(amounts[0], 0, "Should receive USDC");
        assertGt(amounts[1], 0, "Should receive EURC");
        assertEq(usdc.balanceOf(alice) - usdcBefore, amounts[0]);
        assertEq(eurc.balanceOf(alice) - eurcBefore, amounts[1]);
        vm.stopPrank();
    }

    function test_removeLiquidityOneToken() public {
        _addInitialLiquidity();

        vm.startPrank(alice);
        uint256 lpBalance = pool.balanceOf(alice);
        uint256 quarterLp = lpBalance / 4;

        uint256 usdcBefore = usdc.balanceOf(alice);
        uint256 amountOut = pool.removeLiquidityOneToken(quarterLp, 0, 0);

        assertGt(amountOut, 0, "Should receive USDC");
        assertEq(usdc.balanceOf(alice) - usdcBefore, amountOut);
        vm.stopPrank();
    }

    // ==================== Vault Tests ====================

    function test_vault_deposit_withdraw() public {
        _addInitialLiquidity();

        vm.startPrank(alice);
        uint256 lpBalance = pool.balanceOf(alice);
        uint256 depositAmount = lpBalance / 2;

        // Deposit LP into vault
        IERC20(address(pool)).approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, alice);
        assertGt(shares, 0, "Should receive vault shares");

        // Withdraw from vault
        uint256 lpBefore = pool.balanceOf(alice);
        vault.redeem(shares, alice, alice);
        uint256 lpAfter = pool.balanceOf(alice);
        assertEq(lpAfter - lpBefore, depositAmount, "Should recover LP");
        vm.stopPrank();
    }

    // ==================== Router Tests ====================

    function test_router_swap() public {
        _addInitialLiquidity();

        vm.startPrank(bob);
        usdc.approve(address(router), type(uint256).max);

        uint256 eurcBefore = eurc.balanceOf(bob);
        router.swap(0, 50e6, 0, bob, block.timestamp + 300);
        uint256 eurcAfter = eurc.balanceOf(bob);

        assertGt(eurcAfter - eurcBefore, 49e6, "Router swap should work");
        vm.stopPrank();
    }

    function test_router_expired() public {
        _addInitialLiquidity();

        vm.startPrank(bob);
        usdc.approve(address(router), type(uint256).max);

        vm.expectRevert(ArcRouter.Expired.selector);
        router.swap(0, 50e6, 0, bob, block.timestamp - 1);
        vm.stopPrank();
    }

    function test_router_addLiquidity() public {
        _addInitialLiquidity();

        vm.startPrank(bob);
        usdc.approve(address(router), type(uint256).max);
        eurc.approve(address(router), type(uint256).max);

        uint256 lpAmount = router.addLiquidity(
            [uint256(1_000e6), uint256(1_000e6)],
            0,
            block.timestamp + 300
        );

        assertGt(lpAmount, 0, "Router should add liquidity");
        assertGt(pool.balanceOf(bob), 0, "Bob should hold LP");
        vm.stopPrank();
    }

    // ==================== Virtual Price Tests ====================

    function test_virtualPrice_increases_with_fees() public {
        _addInitialLiquidity();
        uint256 vpBefore = pool.getVirtualPrice();

        // Do some swaps to generate fees
        vm.startPrank(bob);
        usdc.approve(address(pool), type(uint256).max);
        eurc.approve(address(pool), type(uint256).max);

        for (uint256 i = 0; i < 10; i++) {
            pool.swap(0, 1000e6, 0, bob);
            pool.swap(1, 1000e6, 0, bob);
        }
        vm.stopPrank();

        uint256 vpAfter = pool.getVirtualPrice();
        assertGe(vpAfter, vpBefore, "Virtual price should not decrease");
    }

    // ==================== Admin Tests ====================

    function test_setA() public {
        pool.setA(200);
        assertEq(pool.A(), 200);
    }

    function test_setA_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pool.setA(200);
    }

    // ==================== MultiRouter Tests ====================

    function test_multiRouter_swap() public {
        _addInitialLiquidity();
        _addPool2Liquidity();

        vm.startPrank(bob);
        usdc.approve(address(multiRouter), type(uint256).max);

        uint256 eurcBefore = eurc.balanceOf(bob);
        multiRouter.swap(
            address(usdc), address(eurc), 100e6, 0, bob, block.timestamp + 300
        );
        uint256 eurcAfter = eurc.balanceOf(bob);

        assertGt(eurcAfter - eurcBefore, 99e6, "MultiRouter swap should work");
        vm.stopPrank();
    }

    function test_multiRouter_multiHop() public {
        _addInitialLiquidity();
        _addPool2Liquidity();

        // EURC -> USDC -> USYC (multi-hop through USDC)
        vm.startPrank(bob);
        eurc.approve(address(multiRouter), type(uint256).max);

        address[] memory path = new address[](3);
        path[0] = address(eurc);
        path[1] = address(usdc);
        path[2] = address(usyc);

        uint256 usycBefore = usyc.balanceOf(bob);
        multiRouter.swapMultiHop(path, 100e6, 0, bob, block.timestamp + 300);
        uint256 usycAfter = usyc.balanceOf(bob);

        assertGt(usycAfter - usycBefore, 98e6, "Multi-hop should work with low slippage");
        vm.stopPrank();
    }

    function test_multiRouter_getBestQuote() public {
        _addInitialLiquidity();

        (uint256 amountOut, uint256 poolIdx) = multiRouter.getBestQuote(
            address(usdc), address(eurc), 100e6
        );
        assertGt(amountOut, 99e6, "Should get good quote");
        assertEq(poolIdx, 0, "Should use pool 0");
    }

    function test_multiRouter_noRoute() public {
        // No liquidity added, no pools match
        vm.startPrank(bob);
        eurc.approve(address(multiRouter), type(uint256).max);

        // eurc -> usyc has no direct pool
        vm.expectRevert(MultiRouter.NoRoute.selector);
        multiRouter.swap(
            address(eurc), address(usyc), 100e6, 0, bob, block.timestamp + 300
        );
        vm.stopPrank();
    }

    // ==================== Helpers ====================

    function _addInitialLiquidity() internal {
        vm.startPrank(alice);
        usdc.approve(address(pool), type(uint256).max);
        eurc.approve(address(pool), type(uint256).max);
        pool.addLiquidity([uint256(100_000e6), uint256(100_000e6)], 0);
        vm.stopPrank();
    }

    function _addPool2Liquidity() internal {
        vm.startPrank(alice);
        usdc.approve(address(pool2), type(uint256).max);
        usyc.approve(address(pool2), type(uint256).max);
        pool2.addLiquidity([uint256(100_000e6), uint256(100_000e6)], 0);
        vm.stopPrank();
    }
}
