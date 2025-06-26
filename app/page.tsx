"use client";

import { useSignerStatus } from "@account-kit/react";
import { useState } from "react";
import UserInfoCard from "./components/user-info-card";
import NftMintCard from "./components/nft-mint-card";
import LoginCard from "./components/login-card";
import Header from "./components/header";
import LearnMore from "./components/learn-more";
import CCIPToolsDemo from "../components/ui/ccip-tools-demo";

export default function Home() {
  const signerStatus = useSignerStatus();
  const [activeTab, setActiveTab] = useState("ccip"); // Default to CCIP

  const tabs = [
    { id: "ccip", label: "Cross-Chain Transfer", icon: "🔗" },
    { id: "nft", label: "NFT Minting", icon: "🎨" }
  ];

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
                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-4 text-center">Smart Wallet Demo</h2>
                  <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                          activeTab === tab.id
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-600 hover:text-gray-800"
                        }`}
                      >
                        <span className="text-lg">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab Descriptions */}
                  <div className="text-center mb-4">
                    {activeTab === "ccip" && (
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-blue-600">🚀 Cross-Chain USDC Transfers</h3>
                        <p className="text-sm text-gray-600">
                          Send USDC from Arbitrum to Base with zero gas fees using Chainlink CCIP
                        </p>
                        <div className="flex justify-center gap-4 text-xs text-green-600 font-medium">
                          <span>✅ Gasless</span>
                          <span>✅ Cross-Chain</span>
                          <span>✅ Account Abstraction</span>
                        </div>
                      </div>
                    )}
                    {activeTab === "nft" && (
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-purple-600">🎨 NFT Minting</h3>
                        <p className="text-sm text-gray-600">
                          Mint NFTs with no gas fees through gas sponsorship
                        </p>
                        <div className="flex justify-center gap-4 text-xs text-green-600 font-medium">
                          <span>✅ Gasless</span>
                          <span>✅ Single-Chain</span>
                          <span>✅ Account Abstraction</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === "ccip" && <CCIPToolsDemo />}
                {activeTab === "nft" && <NftMintCard />}
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