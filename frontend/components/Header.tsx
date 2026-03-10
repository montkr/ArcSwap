"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

const tabs = [
  { key: "swap", label: "Swap" },
  { key: "pool", label: "Pool" },
  { key: "bridge", label: "Bridge" },
  { key: "vault", label: "Vault" },
  { key: "faucet", label: "Faucet" },
  { key: "history", label: "History" },
  { key: "stats", label: "Stats" },
];

export function Header({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <header className="border-b border-[#334155]">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            ArcSwap
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            Testnet
          </span>
        </div>
        <ConnectButton />
      </div>
      <nav className="flex gap-1 px-6 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-[#334155] text-white"
                : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
