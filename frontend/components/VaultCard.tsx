"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { POOL_ADDRESS, VAULT_ADDRESS, POOL_ABI, VAULT_ABI, ERC20_ABI } from "@/lib/contracts";

export function VaultCard() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "executing">("idle");

  const parsedAmount = amount ? parseUnits(amount, 18) : BigInt(0);

  const { data: lpBal } = useReadContract({
    address: POOL_ADDRESS, abi: POOL_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: vaultShares } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: totalAssets } = useReadContract({
    address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "totalAssets",
  });
  const { data: lpAllowance, refetch: refetchAllowance } = useReadContract({
    address: POOL_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      setStep("idle");
      setAmount("");
      refetchAllowance();
    }
  }, [isSuccess]);

  function handleDeposit() {
    if (!address || parsedAmount === BigInt(0)) return;
    const needApproval = (lpAllowance ?? BigInt(0)) < parsedAmount;
    if (needApproval) {
      setStep("approving");
      writeContract({
        address: POOL_ADDRESS, abi: ERC20_ABI, functionName: "approve",
        args: [VAULT_ADDRESS, parsedAmount],
      });
      return;
    }
    setStep("executing");
    writeContract({
      address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit",
      args: [parsedAmount, address],
    });
  }

  function handleWithdraw() {
    if (!address || parsedAmount === BigInt(0)) return;
    setStep("executing");
    writeContract({
      address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "redeem",
      args: [parsedAmount, address, address],
    });
  }

  const isBusy = isPending || step !== "idle";
  const balance = tab === "deposit" ? lpBal : vaultShares;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-[#334155]">
        <h2 className="text-xl font-bold mb-4">Vault (ERC-4626)</h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setTab("deposit"); setAmount(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              tab === "deposit" ? "bg-blue-600" : "bg-[#334155] hover:bg-[#475569]"
            }`}
          >
            Deposit LP
          </button>
          <button
            onClick={() => { setTab("withdraw"); setAmount(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
              tab === "withdraw" ? "bg-blue-600" : "bg-[#334155] hover:bg-[#475569]"
            }`}
          >
            Withdraw
          </button>
        </div>

        <div className="bg-[#0f172a] rounded-xl p-4 mb-4">
          <div className="flex justify-between text-sm text-[#94a3b8] mb-2">
            <span>{tab === "deposit" ? "LP Tokens" : "Vault Shares"}</span>
            <span>
              Balance: {balance !== undefined ? Number(formatUnits(balance, 18)).toFixed(6) : "..."}
            </span>
          </div>
          <input
            type="number" placeholder="0.0" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-transparent text-xl font-medium outline-none w-full"
          />
          {balance && balance > BigInt(0) && (
            <button
              onClick={() => setAmount(formatUnits(balance, 18))}
              className="text-xs text-blue-400 mt-1 hover:underline"
            >
              Max
            </button>
          )}
        </div>

        <button
          onClick={tab === "deposit" ? handleDeposit : handleWithdraw}
          disabled={!isConnected || parsedAmount === BigInt(0) || isBusy}
          className="w-full py-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isBusy ? "Processing..." : tab === "deposit" ? "Deposit" : "Withdraw"}
        </button>

        {txHash && (
          <a
            href={`https://testnet.arcscan.app/tx/${txHash}`}
            target="_blank" rel="noopener noreferrer"
            className="block text-center mt-2 text-sm text-blue-400 hover:underline"
          >
            View on ArcScan
          </a>
        )}

        <div className="mt-4 pt-4 border-t border-[#334155] text-xs text-[#94a3b8] space-y-1">
          <div className="flex justify-between">
            <span>Your Vault Shares</span>
            <span>{vaultShares !== undefined ? Number(formatUnits(vaultShares, 18)).toFixed(6) : "..."}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Vault Assets (LP)</span>
            <span>{totalAssets !== undefined ? Number(formatUnits(totalAssets, 18)).toFixed(6) : "..."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
