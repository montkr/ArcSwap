# ArcSwap - Stablecoin DEX on Arc Network

Triple AMM DEX on Arc Testnet (Circle's L1 blockchain): ConstantProduct (x*y=k) + StableSwap + Claimable Fee Pool.

**Live**: https://wanggang22.github.io/ArcSwap/

## Features

- **Swap** - Multi-pool swap with pool selector (x*y=k / StableSwap / Claimable Fee)
- **Pool** - Add/remove liquidity + Claim Fees (for Claimable Fee pools)
- **Bridge** - CCTP v2 cross-chain (Sepolia <> Arc)
- **Vault** - ERC-4626 yield vault for LP tokens
- **Faucet** - Token balances (USDC/EURC/USYC/ARC/LP) and faucet links
- **History** - On-chain event viewer across all pools
- **Stats** - Pool statistics dashboard with pool selector

## Pool Types

| Type | Pool | AMM | Fee Model |
|------|------|-----|-----------|
| ConstantProduct | USDC/EURC | x*y=k (real exchange rate) | Fee stays in reserves (Uniswap v2 style) |
| StableSwap | USDC/USYC | Curve (A=100) | Admin fee claimable by owner |
| Claimable Fee | USDC/ARC | x*y=k + separate fee accounting | LP holders claim fees via `claimFees()` |

## Deployed Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| CP Pool USDC/EURC | `0x4c6B667a14Eb70F49D3C77f85b5Fc551A2e7CcBc` |
| SS Pool USDC/USYC | `0x9baa830F14d43f76ddE073ACcB17D2B5a98ad0e2` |
| Claimable Pool USDC/ARC | `0xF045Af472C1cf64e5604991AFB1E90CB97339a7d` |
| MultiRouter v2 | `0x2d667ad1BB962179072a33B6592de53f184D5187` |
| ArcVault (ERC-4626) | `0x30B0f3Df0B89633aC392D4203F09BDa546d2db77` |

## Tech Stack

- **Contracts**: Solidity 0.8.24 + OpenZeppelin v5 + Foundry
- **Frontend**: Next.js 16 + wagmi v2 + RainbowKit + viem + Tailwind CSS
- **Network**: Arc Testnet (Chain ID: 5042002, Gas: USDC)
- **Deployment**: GitHub Pages via Actions

## Development

```bash
# Contracts
forge build
forge test

# Frontend
cd frontend
npm install
npm run dev
```
