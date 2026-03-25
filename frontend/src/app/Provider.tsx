"use client";

import React, { useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: "Nexus Flow",
  projectId: "0cbf768b6a2280e163a092db5701b4a4",
  chains: [baseSepolia],
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  // 2. Initialize QueryClient inside the component to ensure it is unique per request
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
