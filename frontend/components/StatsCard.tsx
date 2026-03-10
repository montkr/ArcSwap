"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import {
  POOLS,
  VAULT_ADDRESS,
  MULTI_ROUTER_ADDRESS,
  POOL_ABI,
  VAULT_ABI,
} from "@/lib/contracts";

function PoolStats({ poolIdx }: { poolIdx: number }) {
  const pool = POOLS[poolIdx];

  const { data: poolBalances } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "balances",
  });
  const { data: totalSupply } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "totalSupply",
  });
  const { data: virtualPrice } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "getVirtualPrice",
  });
  const { data: ampFactor } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "A",
  });
  const { data: feeRate } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "fee",
  });

  const tvl0 = poolBalances ? Number(formatUnits(poolBalances[0], pool.token0.decimals)) : 0;
  const tvl1 = poolBalances ? Number(formatUnits(poolBalances[1], pool.token1.decimals)) : 0;
  const tvl = tvl0 + tvl1;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0f172a] rounded-xl p-4">
          <div className="text-sm text-[#94a3b8] mb-1">Total Value Locked</div>
          <div className="text-2xl font-bold text-blue-400">${tvl.toFixed(2)}</div>
          <div className="text-xs text-[#64748b] mt-1">{tvl0.toFixed(2)} {pool.token0.symbol} + {tvl1.toFixed(2)} {pool.token1.symbol}</div>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-4">
          <div className="text-sm text-[#94a3b8] mb-1">LP Token Supply</div>
          <div className="text-2xl font-bold text-purple-400">{totalSupply ? Number(formatUnits(totalSupply, 18)).toFixed(4) : "..."}</div>
          <div className="text-xs text-[#64748b] mt-1">{pool.name} LP</div>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-4">
          <div className="text-sm text-[#94a3b8] mb-1">Virtual Price</div>
          <div className="text-2xl font-bold text-green-400">{virtualPrice ? Number(formatUnits(virtualPrice, 18)).toFixed(6) : "..."}</div>
          <div className="text-xs text-[#64748b] mt-1">LP value per token</div>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-4">
          <div className="text-sm text-[#94a3b8] mb-1">Amplification (A) / Fee</div>
          <div className="text-2xl font-bold text-yellow-400">{ampFactor !== undefined ? ampFactor.toString() : "..."}</div>
          <div className="text-xs text-[#64748b] mt-1">Fee: {feeRate !== undefined ? `${(Number(feeRate) / 10000).toFixed(2)}%` : "..."}</div>
        </div>
      </div>

      {/* Pool composition bar */}
      {poolBalances && tvl > 0 && (
        <div className="mb-4">
          <div className="h-4 rounded-full overflow-hidden flex bg-[#0f172a]">
            <div className="bg-blue-500 transition-all" style={{ width: `${(tvl0 / tvl) * 100}%` }} />
            <div className="bg-green-500 transition-all" style={{ width: `${(tvl1 / tvl) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#94a3b8]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {pool.token0.symbol} {((tvl0 / tvl) * 100).toFixed(1)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {pool.token1.symbol} {((tvl1 / tvl) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export function StatsCard() {
  const [poolIdx, setPoolIdx] = useState(0);

  const { data: vaultAssets } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "totalAssets",
  });

  const contracts = [
    ...POOLS.map((p) => ({ name: `Pool ${p.name}`, addr: p.address })),
    { name: "MultiRouter", addr: MULTI_ROUTER_ADDRESS },
    { name: "ArcVault", addr: VAULT_ADDRESS },
    ...POOLS.flatMap((p) => [
      { name: p.token0.symbol, addr: p.token0.address },
      { name: p.token1.symbol, addr: p.token1.address },
    ]),
  ];
  // Deduplicate by address
  const seen = new Set<string>();
  const uniqueContracts = contracts.filter((c) => {
    if (seen.has(c.addr)) return false;
    seen.add(c.addr);
    return true;
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-[#334155]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Pool Statistics</h2>
          <select
            value={poolIdx}
            onChange={(e) => setPoolIdx(Number(e.target.value))}
            className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-1.5 text-sm font-medium outline-none"
          >
            {POOLS.map((p, i) => (
              <option key={p.address} value={i}>{p.name}</option>
            ))}
          </select>
        </div>

        <PoolStats poolIdx={poolIdx} />

        {/* Vault info */}
        <div className="bg-[#0f172a] rounded-xl p-4 mb-6">
          <div className="text-sm text-[#94a3b8] mb-1">Vault Total Assets</div>
          <div className="text-2xl font-bold text-orange-400">
            {vaultAssets !== undefined ? Number(formatUnits(vaultAssets, 18)).toFixed(6) : "..."}
          </div>
          <div className="text-xs text-[#64748b] mt-1">LP tokens in vault</div>
        </div>

        {/* Contract addresses */}
        <div className="pt-4 border-t border-[#334155]">
          <h3 className="text-sm font-semibold text-[#94a3b8] mb-3 uppercase tracking-wider">Contracts</h3>
          <div className="space-y-2 text-xs">
            {uniqueContracts.map((c) => (
              <div key={c.addr} className="flex justify-between items-center bg-[#0f172a] rounded-lg px-3 py-2">
                <span className="text-[#94a3b8]">{c.name}</span>
                <a
                  href={`https://testnet.arcscan.app/address/${c.addr}`}
                  target="_blank" rel="noopener noreferrer"
                  className="font-mono text-blue-400 hover:underline"
                >
                  {c.addr.slice(0, 8)}...{c.addr.slice(-6)}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
