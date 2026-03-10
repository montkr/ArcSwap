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

export function SwapCard() {
  const { address, isConnected } = useAccount();
  const [poolIdx, setPoolIdx] = useState(0);
  const [direction, setDirection] = useState(0); // 0 = token0->token1, 1 = token1->token0
  const [amountIn, setAmountIn] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "swapping">("idle");

  const pool = POOLS[poolIdx];
  const tokenIn = direction === 0 ? pool.token0 : pool.token1;
  const tokenOut = direction === 0 ? pool.token1 : pool.token0;
  const tokenInIndex = direction;

  const parsedAmount = amountIn
    ? parseUnits(amountIn, tokenIn.decimals)
    : BigInt(0);

  // Read balances
  const { data: balanceIn } = useReadContract({
    address: tokenIn.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: balanceOut } = useReadContract({
    address: tokenOut.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read allowance (against pool directly)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, pool.address] : undefined,
    query: { enabled: !!address },
  });

  // Get amount out preview
  const { data: amountOut } = useReadContract({
    address: pool.address,
    abi: POOL_ABI,
    functionName: "getAmountOut",
    args: [BigInt(tokenInIndex), parsedAmount],
    query: { enabled: parsedAmount > BigInt(0) },
  });

  // Pool balances
  const { data: poolBalances } = useReadContract({
    address: pool.address,
    abi: POOL_ABI,
    functionName: "balances",
  });

  // Write: approve
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApproving,
  } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // Write: swap
  const {
    writeContract: writeSwap,
    data: swapTxHash,
    isPending: isSwapping,
  } = useWriteContract();

  const { isSuccess: swapConfirmed } = useWaitForTransactionReceipt({
    hash: swapTxHash,
  });

  // After approve confirmed, do swap
  useEffect(() => {
    if (approveConfirmed && step === "approving") {
      refetchAllowance();
      setStep("swapping");
      doSwap();
    }
  }, [approveConfirmed]);

  // After swap confirmed, reset
  useEffect(() => {
    if (swapConfirmed) {
      setStep("idle");
      setAmountIn("");
    }
  }, [swapConfirmed]);

  // Reset when pool changes
  useEffect(() => {
    setAmountIn("");
    setDirection(0);
  }, [poolIdx]);

  const needsApproval =
    parsedAmount > BigInt(0) && allowance !== undefined && allowance < parsedAmount;

  function doSwap() {
    if (!address || parsedAmount === BigInt(0)) return;
    const minOut = amountOut ? (amountOut * BigInt(995)) / BigInt(1000) : BigInt(0);
    writeSwap({
      address: pool.address,
      abi: POOL_ABI,
      functionName: "swap",
      args: [BigInt(tokenInIndex), parsedAmount, minOut, address],
    });
  }

  function handleSwap() {
    if (needsApproval) {
      setStep("approving");
      writeApprove({
        address: tokenIn.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [pool.address, parsedAmount],
      });
    } else {
      setStep("swapping");
      doSwap();
    }
  }

  function flipTokens() {
    setDirection(1 - direction);
    setAmountIn("");
  }

  const isBusy = isApproving || isSwapping || step !== "idle";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-[#334155]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Swap</h2>
          <select
            value={poolIdx}
            onChange={(e) => setPoolIdx(Number(e.target.value))}
            className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-1.5 text-sm font-medium outline-none"
          >
            {POOLS.map((p, i) => (
              <option key={p.address} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Token In */}
        <div className="bg-[#0f172a] rounded-xl p-4 mb-2">
          <div className="flex justify-between text-sm text-[#94a3b8] mb-2">
            <span>You pay</span>
            <span>
              Balance:{" "}
              {balanceIn !== undefined
                ? formatUnits(balanceIn, tokenIn.decimals)
                : "..."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className="bg-transparent text-2xl font-medium outline-none flex-1 w-0"
            />
            <div className="bg-[#334155] px-4 py-2 rounded-xl font-semibold text-sm">
              {tokenIn.symbol}
            </div>
          </div>
        </div>

        {/* Flip button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={flipTokens}
            className="bg-[#334155] border-4 border-[#1e293b] rounded-xl p-2 hover:bg-[#475569] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Token Out */}
        <div className="bg-[#0f172a] rounded-xl p-4 mt-2">
          <div className="flex justify-between text-sm text-[#94a3b8] mb-2">
            <span>You receive</span>
            <span>
              Balance:{" "}
              {balanceOut !== undefined
                ? formatUnits(balanceOut, tokenOut.decimals)
                : "..."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-medium flex-1">
              {amountOut !== undefined && parsedAmount > BigInt(0)
                ? formatUnits(amountOut, tokenOut.decimals)
                : "0.0"}
            </div>
            <div className="bg-[#334155] px-4 py-2 rounded-xl font-semibold text-sm">
              {tokenOut.symbol}
            </div>
          </div>
        </div>

        {/* Rate info */}
        {amountOut !== undefined && parsedAmount > BigInt(0) && (
          <div className="mt-3 p-3 bg-[#0f172a] rounded-xl text-sm text-[#94a3b8]">
            <div className="flex justify-between">
              <span>Rate</span>
              <span>
                1 {tokenIn.symbol} ={" "}
                {(
                  Number(formatUnits(amountOut, tokenOut.decimals)) /
                  Number(amountIn)
                ).toFixed(6)}{" "}
                {tokenOut.symbol}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Fee</span>
              <span>0.04%</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Slippage tolerance</span>
              <span>0.5%</span>
            </div>
          </div>
        )}

        {/* Swap button */}
        <button
          onClick={handleSwap}
          disabled={!isConnected || parsedAmount === BigInt(0) || isBusy}
          className="w-full mt-4 py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
        >
          {!isConnected
            ? "Connect Wallet"
            : isBusy
            ? step === "approving"
              ? "Approving..."
              : "Swapping..."
            : needsApproval
            ? `Approve ${tokenIn.symbol}`
            : "Swap"}
        </button>

        {/* Tx links */}
        {swapTxHash && (
          <a
            href={`https://testnet.arcscan.app/tx/${swapTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center mt-2 text-sm text-blue-400 hover:underline"
          >
            View on ArcScan
          </a>
        )}

        {/* Pool info */}
        {poolBalances && (
          <div className="mt-4 pt-4 border-t border-[#334155] text-xs text-[#94a3b8]">
            <div className="flex justify-between">
              <span>Pool {pool.token0.symbol}</span>
              <span>{formatUnits(poolBalances[0], pool.token0.decimals)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Pool {pool.token1.symbol}</span>
              <span>{formatUnits(poolBalances[1], pool.token1.decimals)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
