"use client";

import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits, parseAbiItem } from "viem";
import { POOLS, arcTestnet } from "@/lib/contracts";

interface SwapEvent {
  txHash: string;
  blockNumber: bigint;
  sender: string;
  tokenInIndex: bigint;
  amountIn: bigint;
  amountOut: bigint;
  receiver: string;
  type: "swap";
  poolName: string;
  token0Symbol: string;
  token1Symbol: string;
}

interface LiquidityEvent {
  txHash: string;
  blockNumber: bigint;
  provider: string;
  amounts: readonly [bigint, bigint];
  lpAmount: bigint;
  type: "add" | "remove";
  poolName: string;
  token0Symbol: string;
  token1Symbol: string;
}

type PoolEvent = SwapEvent | LiquidityEvent;

export function HistoryCard() {
  const client = usePublicClient({ chainId: arcTestnet.id });
  const [events, setEvents] = useState<PoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) return;
    fetchEvents();
  }, [client]);

  async function fetchEvents() {
    if (!client) return;
    setLoading(true);
    setError("");

    try {
      const currentBlock = await client.getBlockNumber();
      const fromBlock = currentBlock > BigInt(5000) ? currentBlock - BigInt(5000) : BigInt(0);

      const allEvents: PoolEvent[] = [];

      for (const pool of POOLS) {
        const [swapLogs, addLogs, removeLogs] = await Promise.all([
          client.getLogs({
            address: pool.address,
            event: parseAbiItem(
              "event Swap(address indexed sender, uint256 tokenInIndex, uint256 amountIn, uint256 amountOut, address indexed receiver)"
            ),
            fromBlock,
            toBlock: currentBlock,
          }),
          client.getLogs({
            address: pool.address,
            event: parseAbiItem(
              "event AddLiquidity(address indexed provider, uint256[2] amounts, uint256 lpMinted)"
            ),
            fromBlock,
            toBlock: currentBlock,
          }),
          client.getLogs({
            address: pool.address,
            event: parseAbiItem(
              "event RemoveLiquidity(address indexed provider, uint256[2] amounts, uint256 lpBurned)"
            ),
            fromBlock,
            toBlock: currentBlock,
          }),
        ]);

        allEvents.push(
          ...swapLogs.map((log) => ({
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            sender: log.args.sender!,
            tokenInIndex: log.args.tokenInIndex!,
            amountIn: log.args.amountIn!,
            amountOut: log.args.amountOut!,
            receiver: log.args.receiver!,
            type: "swap" as const,
            poolName: pool.name,
            token0Symbol: pool.token0.symbol,
            token1Symbol: pool.token1.symbol,
          })),
          ...addLogs.map((log) => ({
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            provider: log.args.provider!,
            amounts: log.args.amounts!,
            lpAmount: log.args.lpMinted!,
            type: "add" as const,
            poolName: pool.name,
            token0Symbol: pool.token0.symbol,
            token1Symbol: pool.token1.symbol,
          })),
          ...removeLogs.map((log) => ({
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            provider: log.args.provider!,
            amounts: log.args.amounts!,
            lpAmount: log.args.lpBurned!,
            type: "remove" as const,
            poolName: pool.name,
            token0Symbol: pool.token0.symbol,
            token1Symbol: pool.token1.symbol,
          })),
        );
      }

      allEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setEvents(allEvents);
    } catch (err: any) {
      setError(err.message || "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }

  function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-[#1e293b] rounded-2xl p-6 shadow-xl border border-[#334155]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Transaction History</h2>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="text-sm px-3 py-1 bg-[#334155] rounded-lg hover:bg-[#475569] transition disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-sm text-red-300">
            {error}
          </div>
        )}

        {events.length === 0 && !loading && (
          <div className="text-center py-8 text-[#94a3b8]">
            No transactions found in recent blocks
          </div>
        )}

        <div className="space-y-2">
          {events.map((evt, i) => (
            <div
              key={`${evt.txHash}-${i}`}
              className="bg-[#0f172a] rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  evt.type === "swap"
                    ? "bg-blue-500/20 text-blue-400"
                    : evt.type === "add"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {evt.type === "swap" ? "S" : evt.type === "add" ? "+" : "-"}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {evt.type === "swap" ? (
                      <>
                        Swap {(evt as SwapEvent).tokenInIndex === BigInt(0) ? evt.token0Symbol : evt.token1Symbol}
                        {" → "}
                        {(evt as SwapEvent).tokenInIndex === BigInt(0) ? evt.token1Symbol : evt.token0Symbol}
                      </>
                    ) : evt.type === "add" ? (
                      "Add Liquidity"
                    ) : (
                      "Remove Liquidity"
                    )}
                  </div>
                  <div className="text-xs text-[#64748b]">
                    {evt.type === "swap"
                      ? `${formatUnits((evt as SwapEvent).amountIn, 6)} → ${formatUnits((evt as SwapEvent).amountOut, 6)}`
                      : `${formatUnits((evt as LiquidityEvent).amounts[0], 6)} ${evt.token0Symbol} + ${formatUnits((evt as LiquidityEvent).amounts[1], 6)} ${evt.token1Symbol}`
                    }
                    <span className="ml-1 text-[#475569]">[{evt.poolName}]</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-[#94a3b8]">
                  {shortAddr(evt.type === "swap" ? (evt as SwapEvent).sender : (evt as LiquidityEvent).provider)}
                </div>
                <a
                  href={`https://testnet.arcscan.app/tx/${evt.txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  Block #{evt.blockNumber.toString()}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
