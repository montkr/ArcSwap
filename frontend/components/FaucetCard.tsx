"use client";

import { useAccount, useReadContract, useBalance } from "wagmi";
import { formatUnits } from "viem";
import {
  USDC_ARC,
  EURC_ARC,
  USYC_ARC,
  POOL_USDC_EURC,
  POOL_USDC_USYC,
  VAULT_ADDRESS,
  ERC20_ABI,
  POOL_ABI,
  VAULT_ABI,
  arcTestnet,
} from "@/lib/contracts";

export function FaucetCard() {
  const { address, isConnected } = useAccount();

  // Native USDC (gas) balance
  const { data: nativeBalance } = useBalance({
    address,
    chainId: arcTestnet.id,
  });

  // ERC-20 balances on Arc
  const { data: usdcBal } = useReadContract({
    address: USDC_ARC, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: eurcBal } = useReadContract({
    address: EURC_ARC, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: usycBal } = useReadContract({
    address: USYC_ARC, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: lpBal } = useReadContract({
    address: POOL_USDC_EURC, abi: POOL_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: lp2Bal } = useReadContract({
    address: POOL_USDC_USYC, abi: POOL_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: vaultBal } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const tokens = [
    {
      symbol: "USDC",
      label: "Native Gas (18 dec)",
      balance: nativeBalance ? nativeBalance.formatted : "...",
      color: "text-blue-400",
    },
    {
      symbol: "USDC",
      label: "ERC-20 (6 dec)",
      balance: usdcBal !== undefined ? formatUnits(usdcBal, 6) : "...",
      color: "text-blue-400",
    },
    {
      symbol: "EURC",
      label: "ERC-20 (6 dec)",
      balance: eurcBal !== undefined ? formatUnits(eurcBal, 6) : "...",
      color: "text-green-400",
    },
    {
      symbol: "USYC",
      label: "ERC-20 (6 dec)",
      balance: usycBal !== undefined ? formatUnits(usycBal, 6) : "...",
      color: "text-cyan-400",
    },
    {
      symbol: "asLP-USDC-EURC",
      label: "LP Token (18 dec)",
      balance: lpBal !== undefined ? Number(formatUnits(lpBal, 18)).toFixed(6) : "...",
      color: "text-purple-400",
    },
    {
      symbol: "asLP-USDC-USYC",
      label: "LP Token (18 dec)",
      balance: lp2Bal !== undefined ? Number(formatUnits(lp2Bal, 18)).toFixed(6) : "...",
      color: "text-purple-300",
    },
    {
      symbol: "avShares",
      label: "Vault Shares (18 dec)",
      balance: vaultBal !== undefined ? Number(formatUnits(vaultBal, 18)).toFixed(6) : "...",
      color: "text-yellow-400",
    },
  ];

  const faucets = [
    {
      name: "Circle Faucet (USDC + EURC)",
      desc: "Official Circle faucet for Arc Testnet tokens",
      url: "https://faucet.circle.com/",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      name: "Sepolia Faucet (ETH)",
      desc: "Get Sepolia ETH for bridge gas fees",
      url: "https://www.alchemy.com/faucets/ethereum-sepolia",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      name: "Sepolia USDC Faucet",
      desc: "Get test USDC on Sepolia for bridging to Arc",
      url: "https://faucet.circle.com/",
      color: "bg-green-600 hover:bg-green-700",
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-[#334155]">
        <h2 className="text-xl font-bold mb-4">Faucet & Balances</h2>

        {/* Wallet info */}
        {isConnected && address ? (
          <div className="bg-[#0f172a] rounded-xl p-4 mb-4">
            <div className="text-sm text-[#94a3b8] mb-1">Connected Wallet</div>
            <div className="font-mono text-sm break-all">{address}</div>
            <a
              href={`https://testnet.arcscan.app/address/${address}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline mt-1 inline-block"
            >
              View on ArcScan
            </a>
          </div>
        ) : (
          <div className="bg-[#0f172a] rounded-xl p-4 mb-4 text-center text-[#94a3b8]">
            Connect your wallet to view balances
          </div>
        )}

        {/* Token Balances */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[#94a3b8] mb-3 uppercase tracking-wider">
            Arc Testnet Balances
          </h3>
          <div className="space-y-2">
            {tokens.map((t, i) => (
              <div key={i} className="flex justify-between items-center bg-[#0f172a] rounded-lg px-4 py-3">
                <div>
                  <span className={`font-semibold ${t.color}`}>{t.symbol}</span>
                  <span className="text-xs text-[#64748b] ml-2">{t.label}</span>
                </div>
                <span className="font-mono text-sm">{isConnected ? t.balance : "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Faucet Links */}
        <div>
          <h3 className="text-sm font-semibold text-[#94a3b8] mb-3 uppercase tracking-wider">
            Get Test Tokens
          </h3>
          <div className="space-y-3">
            {faucets.map((f, i) => (
              <a
                key={i}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-xl p-4 transition ${f.color}`}
              >
                <div className="font-semibold">{f.name}</div>
                <div className="text-sm opacity-80 mt-1">{f.desc}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Network info */}
        <div className="mt-6 pt-4 border-t border-[#334155] text-xs text-[#64748b] space-y-1">
          <div className="flex justify-between">
            <span>Network</span>
            <span>Arc Testnet</span>
          </div>
          <div className="flex justify-between">
            <span>Chain ID</span>
            <span>5042002</span>
          </div>
          <div className="flex justify-between">
            <span>RPC</span>
            <span className="font-mono">rpc.testnet.arc.network</span>
          </div>
          <div className="flex justify-between">
            <span>Gas Token</span>
            <span>USDC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
