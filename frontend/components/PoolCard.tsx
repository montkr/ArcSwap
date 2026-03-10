"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  POOLS,
  POOL_ABI,
  ERC20_ABI,
} from "@/lib/contracts";

export function PoolCard() {
  const { address, isConnected } = useAccount();
  const [poolIdx, setPoolIdx] = useState(0);
  const [tab, setTab] = useState<"add" | "remove">("add");
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [lpRemoveAmount, setLpRemoveAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving0" | "approving1" | "executing">("idle");

  const pool = POOLS[poolIdx];

  // Balances
  const { data: bal0 } = useReadContract({
    address: pool.token0.address, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: bal1 } = useReadContract({
    address: pool.token1.address, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: lpBal } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: poolBalances } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "balances",
  });
  const { data: totalSupply } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "totalSupply",
  });
  const { data: virtualPrice } = useReadContract({
    address: pool.address, abi: POOL_ABI, functionName: "getVirtualPrice",
  });

  // Allowances
  const { data: allowance0, refetch: refetchAllowance0 } = useReadContract({
    address: pool.token0.address, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, pool.address] : undefined, query: { enabled: !!address },
  });
  const { data: allowance1, refetch: refetchAllowance1 } = useReadContract({
    address: pool.token1.address, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, pool.address] : undefined, query: { enabled: !!address },
  });

  const parsed0 = amount0 ? parseUnits(amount0, pool.token0.decimals) : BigInt(0);
  const parsed1 = amount1 ? parseUnits(amount1, pool.token1.decimals) : BigInt(0);
  const parsedLpRemove = lpRemoveAmount ? parseUnits(lpRemoveAmount, 18) : BigInt(0);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txConfirmed) {
      setStep("idle");
      setAmount0(""); setAmount1(""); setLpRemoveAmount("");
      refetchAllowance0(); refetchAllowance1();
    }
  }, [txConfirmed]);

  // Reset on pool change
  useEffect(() => {
    setAmount0(""); setAmount1(""); setLpRemoveAmount("");
  }, [poolIdx]);

  function handleAdd() {
    if (!address) return;
    const need0 = parsed0 > BigInt(0) && (allowance0 ?? BigInt(0)) < parsed0;
    const need1 = parsed1 > BigInt(0) && (allowance1 ?? BigInt(0)) < parsed1;

    if (need0) {
      setStep("approving0");
      writeContract({
        address: pool.token0.address, abi: ERC20_ABI, functionName: "approve",
        args: [pool.address, parsed0],
      });
      return;
    }
    if (need1) {
      setStep("approving1");
      writeContract({
        address: pool.token1.address, abi: ERC20_ABI, functionName: "approve",
        args: [pool.address, parsed1],
      });
      return;
    }

    setStep("executing");
    writeContract({
      address: pool.address, abi: POOL_ABI, functionName: "addLiquidity",
      args: [[parsed0, parsed1], BigInt(0)],
    });
  }

  function handleRemove() {
    if (!address || parsedLpRemove === BigInt(0)) return;
    setStep("executing");
    writeContract({
      address: pool.address, abi: POOL_ABI, functionName: "removeLiquidity",
      args: [parsedLpRemove, [BigInt(0), BigInt(0)]],
    });
  }

  const isBusy = isPending || step !== "idle";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-[#334155]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Liquidity Pool</h2>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("add")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === "add" ? "bg-blue-600" : "bg-[#334155] hover:bg-[#475569]"}`}>
            Add Liquidity
          </button>
          <button onClick={() => setTab("remove")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === "remove" ? "bg-blue-600" : "bg-[#334155] hover:bg-[#475569]"}`}>
            Remove
          </button>
        </div>

        {tab === "add" ? (
          <>
            <div className="bg-[#0f172a] rounded-xl p-4 mb-2">
              <div className="flex justify-between text-sm text-[#94a3b8] mb-2">
                <span>{pool.token0.symbol}</span>
                <span>Balance: {bal0 !== undefined ? formatUnits(bal0, pool.token0.decimals) : "..."}</span>
              </div>
              <input type="number" placeholder="0.0" value={amount0}
                onChange={(e) => setAmount0(e.target.value)}
                className="bg-transparent text-xl font-medium outline-none w-full" />
            </div>
            <div className="bg-[#0f172a] rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm text-[#94a3b8] mb-2">
                <span>{pool.token1.symbol}</span>
                <span>Balance: {bal1 !== undefined ? formatUnits(bal1, pool.token1.decimals) : "..."}</span>
              </div>
              <input type="number" placeholder="0.0" value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                className="bg-transparent text-xl font-medium outline-none w-full" />
            </div>
            <button onClick={handleAdd}
              disabled={!isConnected || (parsed0 === BigInt(0) && parsed1 === BigInt(0)) || isBusy}
              className="w-full py-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50">
              {isBusy ? "Processing..." : "Add Liquidity"}
            </button>
          </>
        ) : (
          <>
            <div className="bg-[#0f172a] rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm text-[#94a3b8] mb-2">
                <span>LP Tokens</span>
                <span>Balance: {lpBal !== undefined ? Number(formatUnits(lpBal, 18)).toFixed(6) : "..."}</span>
              </div>
              <input type="number" placeholder="0.0" value={lpRemoveAmount}
                onChange={(e) => setLpRemoveAmount(e.target.value)}
                className="bg-transparent text-xl font-medium outline-none w-full" />
              {lpBal && lpBal > BigInt(0) && (
                <button onClick={() => setLpRemoveAmount(formatUnits(lpBal, 18))}
                  className="text-xs text-blue-400 mt-1 hover:underline">Max</button>
              )}
            </div>
            <button onClick={handleRemove}
              disabled={!isConnected || parsedLpRemove === BigInt(0) || isBusy}
              className="w-full py-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50">
              {isBusy ? "Processing..." : "Remove Liquidity"}
            </button>
          </>
        )}

        {txHash && (
          <a href={`https://testnet.arcscan.app/tx/${txHash}`}
            target="_blank" rel="noopener noreferrer"
            className="block text-center mt-2 text-sm text-blue-400 hover:underline">
            View on ArcScan
          </a>
        )}

        <div className="mt-4 pt-4 border-t border-[#334155] text-xs text-[#94a3b8] space-y-1">
          <div className="flex justify-between">
            <span>Pool {pool.token0.symbol}</span>
            <span>{poolBalances ? formatUnits(poolBalances[0], pool.token0.decimals) : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span>Pool {pool.token1.symbol}</span>
            <span>{poolBalances ? formatUnits(poolBalances[1], pool.token1.decimals) : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span>Total LP Supply</span>
            <span>{totalSupply ? Number(formatUnits(totalSupply, 18)).toFixed(4) : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span>Virtual Price</span>
            <span>{virtualPrice ? Number(formatUnits(virtualPrice, 18)).toFixed(6) : "..."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
