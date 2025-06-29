"use client";

import { useSignerStatus } from "@account-kit/react";
import UserInfoCard from "./components/user-info-card";
import LoginCard from "./components/login-card";
import Header from "./components/header";
import LearnMore from "./components/learn-more";
import CCIPToolsDemo from "../components/ui/ccip-tools-demo";

export default function Home() {
  const signerStatus = useSignerStatus();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <div className="bg-bg-main bg-cover bg-center bg-no-repeat min-h-[calc(100vh-4rem)]">
        <main className="container mx-auto px-4 py-8">
          {signerStatus.isConnected ? (
            <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
              <div className="flex flex-col gap-8">
                <UserInfoCard />
                <LearnMore />
              </div>
              <div className="flex flex-col gap-8">
                {/* Hero Section for CCIP */}
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    🚀 Gasless Cross-Chain Transfers
                  </h1>
                  <p className="text-lg text-gray-600 mb-4">
                    Send USDC from Arbitrum to Base with zero gas fees
                  </p>
                  <div className="flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <span className="text-green-500">✅</span>
                      <span>No Gas Fees</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <span className="text-blue-500">🔗</span>
                      <span>Cross-Chain</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-600 font-medium">
                      <span className="text-purple-500">🔐</span>
                      <span>Account Abstraction</span>
                    </div>
                  </div>
                </div>

                {/* CCIP Transfer Component */}
                <CCIPToolsDemo />
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full pb-[4rem]">
              <LoginCard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}