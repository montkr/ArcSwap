import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet, sepolia } from "./contracts";

export const config = getDefaultConfig({
  appName: "ArcSwap",
  projectId: "arcswap-demo-00000000000000000000",
  chains: [arcTestnet, sepolia],
  ssr: false,
});
