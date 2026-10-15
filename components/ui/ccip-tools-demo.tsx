// components/ui/ccip-tools-demo.tsx
"use client";

import React, { useState } from "react";
import { formatEther } from "viem";
import { Button } from "./button";
import { useCCIPTransfer, type TransferStep } from "@/lib/ccip/useCCIPTransfer";
import { useMessageStatus } from "@/lib/ccip/useMessageStatus";
import { DEST_NETWORK, TRANSFER_TOKENS, ccipExplorerUrl } from "@/lib/ccip/config";

const BUTTON_TEXT: Record<TransferStep, string> = {
  idle: "Send CCIP Transfer",
  checking: "Checking Balance...",
  preparing: "Quoting Fee & Building Transaction...",
  sending: "Sending Sponsored Transaction...",
  sent: "Transfer Sent!",
  error: "Try Again",
};

const STATUS_TEXT: Record<string, string> = {
  SENT: "Sent — waiting for source finality",
  SOURCE_FINALIZED: "Source chain finalized",
  VERIFYING: "Being verified by the CCIP network",
  VERIFIED: "Verified",
  COMMITTED: "Committed on Base Sepolia",
  BLESSED: "Blessed by the Risk Management Network",
  SUCCESS: "Delivered on Base Sepolia",
  FAILED: "Execution failed on destination — can be manually executed from CCIP Explorer",
};

const inputClass =
  "w-full p-4 border-2 border-blue-200 rounded-xl bg-white text-gray-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200";

const CCIPToolsDemo = () => {
  const [tokenIndex, setTokenIndex] = useState(0);
  const [amount, setAmount] = useState("1");
  const [destinationAccount, setDestinationAccount] = useState("");

  const { transfer, reset, step, error, txHash, messageId, fee, ready } = useCCIPTransfer();
  const status = useMessageStatus(messageId);

  const token = TRANSFER_TOKENS[tokenIndex];
  const isProcessing = step === "checking" || step === "preparing" || step === "sending";

  const handleTransfer = () => {
    if (step === "sent" || step === "error") reset();
    transfer({ token, amount, receiver: destinationAccount });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white rounded-2xl shadow-xl border border-blue-200 p-8 mt-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-8 right-8 w-40 h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-2xl"></div>
        <div className="absolute bottom-8 left-8 w-32 h-32 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full blur-lg"></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-100">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="#375BD2" />
              <path d="M8 12C8 10.8954 8.89543 10 10 10H14C15.1046 10 16 10.8954 16 12V14C16 15.1046 15.1046 16 14 16H10C8.89543 16 8 15.1046 8 14V12Z" fill="white" />
              <path d="M8 18C8 16.8954 8.89543 16 10 16H14C15.1046 16 16 16.8954 16 18V20C16 21.1046 15.1046 22 14 22H10C8.89543 22 8 21.1046 8 20V18Z" fill="white" />
              <path d="M18 12C18 10.8954 18.8954 10 20 10H24C25.1046 10 26 10.8954 26 12V14C26 15.1046 25.1046 16 24 16H20C18.8954 16 18 15.1046 18 14V12Z" fill="white" />
              <path d="M18 18C18 16.8954 18.8954 16 20 16H24C25.1046 16 26 16.8954 26 18V20C26 21.1046 25.1046 22 24 22H20C18.8954 22 18 21.1046 18 20V18Z" fill="white" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-900 bg-clip-text text-transparent">
            CCIP Transfer: Arbitrum Sepolia → Base Sepolia
          </h2>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-3">Token to Transfer</label>
            <select
              value={tokenIndex}
              onChange={(e) => {
                setTokenIndex(Number(e.target.value));
                setAmount("1");
              }}
              className={inputClass}
              disabled={isProcessing}
            >
              {TRANSFER_TOKENS.map((t, i) => (
                <option key={t.address} value={i}>
                  {t.symbol} ({t.address})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-3">Amount ({token.symbol})</label>
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1"
              className={inputClass}
              disabled={isProcessing}
            />
          </div>

          <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-3">Destination Account (Base Sepolia)</label>
            <input
              type="text"
              value={destinationAccount}
              onChange={(e) => setDestinationAccount(e.target.value.trim())}
              placeholder="0x... (recipient address on Base Sepolia)"
              className={inputClass}
              disabled={isProcessing}
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={handleTransfer}
              disabled={!ready || isProcessing}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
            >
              {BUTTON_TEXT[step]}
            </Button>
            {fee !== undefined && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                CCIP fee: {formatEther(fee)} ETH (gas is sponsored)
              </p>
            )}
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-sm">
              <strong className="font-semibold">Error:</strong> {error}
            </div>
          )}

          {step === "sent" && txHash && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 text-green-800 px-6 py-4 rounded-xl shadow-sm space-y-2 text-sm">
              <h4 className="font-bold text-lg">Cross-Chain Transfer Sent</h4>
              <p className="bg-white p-3 rounded-lg border border-green-200">
                <strong>Source tx:</strong> <span className="font-mono text-xs break-all">{txHash}</span>
              </p>
              {messageId ? (
                <>
                  <p className="bg-white p-3 rounded-lg border border-green-200">
                    <strong>CCIP message ID:</strong> <span className="font-mono text-xs break-all">{messageId}</span>
                  </p>
                  <p className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <strong>Status:</strong> {status ? STATUS_TEXT[status] ?? status : "Looking up…"}
                  </p>
                  <a
                    href={ccipExplorerUrl(messageId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline font-medium bg-blue-50 px-3 py-2 rounded-lg"
                  >
                    View on CCIP Explorer
                  </a>
                </>
              ) : (
                <p>Reading CCIP message ID from the transaction…</p>
              )}
              <p className="text-xs text-green-700">Destination: {DEST_NETWORK.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CCIPToolsDemo;
