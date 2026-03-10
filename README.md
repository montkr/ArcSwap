# ArcSwap DEX

Curve-style StableSwap DEX on Arc Testnet (Circle's L1 blockchain).

**Live**: https://wanggang22.github.io/arc-dex/

## Features

- **Swap** - USDC/EURC and USDC/USYC pools with Curve StableSwap AMM
- **Pool** - Add/remove liquidity with multi-pool support
- **Bridge** - CCTP v2 cross-chain (Sepolia <> Arc)
- **Vault** - ERC-4626 yield vault for LP tokens
- **Faucet** - Token balances and faucet links
- **History** - On-chain event viewer
- **Stats** - Pool statistics dashboard

## Deployed Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| Pool USDC/EURC | `0x7C22c0C26e846B4Eb4B5EB3556a0EB93c88B844d` |
| Pool USDC/USYC | `0x9baa830F14d43f76ddE073ACcB17D2B5a98ad0e2` |
| MultiRouter | `0x3b54FebaCa3b20595E0A0140d110c4Bf3B3580c2` |
| ArcVault | `0x30B0f3Df0B89633aC392D4203F09BDa546d2db77` |

## Tech Stack

- **Contracts**: Solidity 0.8.24 + OpenZeppelin v5 + Foundry
- **Frontend**: Next.js 16 + wagmi v2 + RainbowKit + viem + Tailwind CSS
- **Network**: Arc Testnet (Chain ID: 5042002, Gas: USDC)

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
