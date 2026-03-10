"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { parseUnits, formatUnits, pad } from "viem";
import {
  USDC_SEPOLIA,
  USDC_ARC,
  CCTP,
  ERC20_ABI,
  TOKEN_MESSENGER_ABI,
  arcTestnet,
  sepolia,
} from "@/lib/contracts";

type Direction = "sepolia-to-arc" | "arc-to-sepolia";

const CHAINS = {
  "sepolia-to-arc": {
    from: { name: "Sepolia", chainId: sepolia.id, usdc: USDC_SEPOLIA, decimals: 6, messenger: CCTP.sepolia.tokenMessenger, domain: CCTP.sepolia.domain },
    to: { name: "Arc Testnet", chainId: arcTestnet.id, domain: CCTP.arc.domain },
  },
  "arc-to-sepolia": {
    from: { name: "Arc Testnet", chainId: arcTestnet.id, usdc: USDC_ARC, decimals: 6, messenger: CCTP.arc.tokenMessenger, domain: CCTP.arc.domain },
    to: { name: "Sepolia", chainId: sepolia.id, domain: CCTP.sepolia.domain },
  },
};

export function BridgeCard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [direction, setDirection] = useState<Direction>("sepolia-to-arc");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "switching" | "approving" | "burning" | "waiting">("idle");

  const route = CHAINS[direction];
  const isOnSourceChain = chainId === route.from.chainId;
  const parsedAmount = amount ? parseUnits(amount, route.from.decimals) : BigInt(0);

  // Source chain USDC balance
  const { data: balance } = useReadContract({
    address: route.from.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isOnSourceChain },
  });

  // Allowance for TokenMessenger
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: route.from.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, route.from.messenger] : undefined,
    query: { enabled: !!address && isOnSourceChain },
  });

  const needsApproval = parsedAmount > BigInt(0) && (allowance ?? BigInt(0)) < parsedAmount;

  // Write contracts
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txConfirmed && step === "approving") {
      refetchAllowance();
      setStep("burning");
      doBurn();
    } else if (txConfirmed && step === "burning") {
      setStep("waiting");
    }
  }, [txConfirmed]);

  function doBurn() {
    if (!address || parsedAmount === BigInt(0)) return;
    const mintRecipient = pad(address, { size: 32 });
    writeContract({
      address: route.from.messenger,
      abi: TOKEN_MESSENGER_ABI,
      functionName: "depositForBurn",
      args: [parsedAmount, route.to.domain, mintRecipient, route.from.usdc],
    });
  }

  function handleBridge() {
    if (!isOnSourceChain) {
      setStep("switching");
      switchChain({ chainId: route.from.chainId });
      return;
    }

    if (needsApproval) {
      setStep("approving");
      writeContract({
        address: route.from.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [route.from.messenger, parsedAmount],
      });
    } else {
      setStep("burning");
      doBurn();
    }
  }

  function flipDirection() {
    setDirection(direction === "sepolia-to-arc" ? "arc-to-sepolia" : "sepolia-to-arc");
    setAmount("");
    setStep("idle");
  }

  const isBusy = isPending || (step !== "idle" && step !== "waiting");

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-[#334155]">
        <h2 className="text-xl font-bold mb-4">Bridge USDC</h2>

        {/* From chain */}
        <div className="bg-[#0f172a] rounded-xl p-4 mb-2">
          <div className="flex justify-between text-sm text-[#94a3b8] mb-2">
            <span>From: {route.from.name}</span>
            <span>
              Balance: {balance !== undefined ? formatUnits(balance, route.from.decimals) : "..."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-2xl font-medium outline-none flex-1 w-0"
            />
            <span className="bg-[#334155] px-4 py-2 rounded-xl font-semibold text-sm">USDC</span>
          </div>
        </div>

        {/* Direction flip */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={flipDirection}
            className="bg-[#334155] border-4 border-[#1e293b] rounded-xl p-2 hover:bg-[#475569] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To chain */}
        <div className="bg-[#0f172a] rounded-xl p-4 mt-2 mb-4">
          <div className="flex justify-between text-sm text-[#94a3b8] mb-2">
            <span>To: {route.to.name}</span>
          </div>
          <div className="text-2xl font-medium">
            {amount || "0.0"} <span className="text-base text-[#94a3b8]">USDC</span>
          </div>
        </div>

        {/* Bridge info */}
        <div className="p-3 bg-[#0f172a] rounded-xl text-sm text-[#94a3b8] mb-4 space-y-1">
          <div className="flex justify-between">
            <span>Protocol</span>
            <span className="text-white">CCTP v2</span>
          </div>
          <div className="flex justify-between">
            <span>Est. Time</span>
            <span className="text-white">~15-20 min</span>
          </div>
          <div className="flex justify-between">
            <span>Fee</span>
            <span className="text-green-400">Free (gas only)</span>
          </div>
          <div className="flex justify-between">
            <span>Network</span>
            <span className={isOnSourceChain ? "text-green-400" : "text-yellow-400"}>
              {isOnSourceChain ? "Correct chain" : "Switch needed"}
            </span>
          </div>
        </div>

        {/* Status steps */}
        {step !== "idle" && (
          <div className="mb-4 p-3 bg-[#0f172a] rounded-xl text-sm space-y-2">
            <Step label="Approve USDC" status={step === "approving" ? "active" : needsApproval ? "pending" : "done"} />
            <Step label="Burn on source chain" status={step === "burning" ? "active" : step === "waiting" ? "done" : "pending"} />
            <Step label="Waiting for attestation" status={step === "waiting" ? "active" : "pending"} />
            <Step label="Mint on destination" status="pending" />
          </div>
        )}

        {step === "waiting" && txHash && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-xl text-sm text-blue-300">
            Burn tx submitted! USDC will arrive on {route.to.name} in ~15-20 minutes via CCTP attestation.
            <a
              href={`https://${direction === "sepolia-to-arc" ? "sepolia.etherscan.io" : "testnet.arcscan.app"}/tx/${txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="block mt-1 text-blue-400 hover:underline"
            >
              View burn transaction
            </a>
          </div>
        )}

        {/* Bridge button */}
        <button
          onClick={handleBridge}
          disabled={!isConnected || parsedAmount === BigInt(0) || isBusy}
          className="w-full py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-700"
        >
          {!isConnected
            ? "Connect Wallet"
            : !isOnSourceChain
            ? `Switch to ${route.from.name}`
            : isBusy
            ? step === "approving"
              ? "Approving..."
              : "Burning..."
            : needsApproval
            ? "Approve & Bridge"
            : "Bridge"}
        </button>
      </div>
    </div>
  );
}

function Step({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        status === "done" ? "bg-green-400" : status === "active" ? "bg-blue-400 animate-pulse" : "bg-[#475569]"
      }`} />
      <span className={status === "done" ? "text-green-400" : status === "active" ? "text-blue-400" : "text-[#64748b]"}>
        {label}
      </span>
    </div>
  );
}
