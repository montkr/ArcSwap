import { defineChain } from "viem";
import { sepolia } from "viem/chains";

export { sepolia };

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

// ==================== Deployed Contracts (v3 - multi-pool) ====================

// Pools
export const POOL_USDC_EURC = "0x7C22c0C26e846B4Eb4B5EB3556a0EB93c88B844d" as const;
export const POOL_USDC_USYC = "0x9baa830F14d43f76ddE073ACcB17D2B5a98ad0e2" as const;
export const VAULT_ADDRESS = "0x30B0f3Df0B89633aC392D4203F09BDa546d2db77" as const;
export const MULTI_ROUTER_ADDRESS = "0x3b54FebaCa3b20595E0A0140d110c4Bf3B3580c2" as const;

// Legacy aliases
export const POOL_ADDRESS = POOL_USDC_EURC;
export const ROUTER_ADDRESS = MULTI_ROUTER_ADDRESS;

// Pool config
export const POOLS = [
  {
    name: "USDC / EURC",
    address: POOL_USDC_EURC,
    token0: { symbol: "USDC", address: "0x3600000000000000000000000000000000000000" as const, decimals: 6 },
    token1: { symbol: "EURC", address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const, decimals: 6 },
  },
  {
    name: "USDC / USYC",
    address: POOL_USDC_USYC,
    token0: { symbol: "USDC", address: "0x3600000000000000000000000000000000000000" as const, decimals: 6 },
    token1: { symbol: "USYC", address: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C" as const, decimals: 6 },
  },
] as const;

// ==================== Token Addresses ====================

export const USDC_ARC = "0x3600000000000000000000000000000000000000" as const;
export const EURC_ARC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;
export const USYC_ARC = "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C" as const;
export const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;

// Legacy exports
export const USDC_ADDRESS = USDC_ARC;
export const EURC_ADDRESS = EURC_ARC;

// ==================== CCTP Bridge Addresses ====================

export const CCTP = {
  sepolia: {
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" as const,
    messageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD" as const,
    domain: 0,
  },
  arc: {
    tokenMessenger: "0xbd3fa81b58ba92a82136038b25adec7066af3155" as const,
    messageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD" as const,
    domain: 26,
  },
} as const;

// ==================== ABIs ====================

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const POOL_ABI = [
  {
    name: "swap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenInIndex", type: "uint256" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "addLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amounts", type: "uint256[2]" },
      { name: "minLpAmount", type: "uint256" },
    ],
    outputs: [{ name: "lpAmount", type: "uint256" }],
  },
  {
    name: "removeLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "lpAmount", type: "uint256" },
      { name: "minAmounts", type: "uint256[2]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[2]" }],
  },
  {
    name: "getAmountOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenInIndex", type: "uint256" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getVirtualPrice",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balances",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[2]" }],
  },
  {
    name: "fee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "A",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "redeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// CCTP TokenMessenger ABI (depositForBurn)
export const TOKEN_MESSENGER_ABI = [
  {
    name: "depositForBurn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
    ],
    outputs: [{ name: "nonce", type: "uint64" }],
  },
] as const;

// Swap event for history
export const POOL_EVENTS_ABI = [
  {
    name: "Swap",
    type: "event",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "tokenInIndex", type: "uint256", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
      { name: "receiver", type: "address", indexed: true },
    ],
  },
  {
    name: "AddLiquidity",
    type: "event",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "amounts", type: "uint256[2]", indexed: false },
      { name: "lpMinted", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RemoveLiquidity",
    type: "event",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "amounts", type: "uint256[2]", indexed: false },
      { name: "lpBurned", type: "uint256", indexed: false },
    ],
  },
] as const;

export const MULTI_ROUTER_ABI = [
  {
    name: "swap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "getBestQuote",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "bestAmountOut", type: "uint256" },
      { name: "bestPoolIdx", type: "uint256" },
    ],
  },
  {
    name: "poolCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
