// components/ui/ccip-tools-demo.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useSmartAccountClient, useSendUserOperation } from '@account-kit/react';
import { encodeFunctionData } from 'viem';
import { Button } from './button';
import { Card } from './card';

// Contract ABIs
const CCIP_ROUTER_ABI = [
  {
    "name": "ccipSend",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      {"name": "destinationChainSelector", "type": "uint64"},
      {
        "name": "message",
        "type": "tuple",
        "components": [
          {"name": "receiver", "type": "bytes"},
          {"name": "data", "type": "bytes"},
          {"name": "tokenAmounts", "type": "tuple[]", "components": [
            {"name": "token", "type": "address"},
            {"name": "amount", "type": "uint256"}
          ]},
          {"name": "feeToken", "type": "address"},
          {"name": "extraArgs", "type": "bytes"}
        ]
      }
    ],
    "outputs": [{"name": "", "type": "bytes32"}]
  },
  {
    "name": "getFee",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {"name": "destinationChainSelector", "type": "uint64"},
      {
        "name": "message",
        "type": "tuple",
        "components": [
          {"name": "receiver", "type": "bytes"},
          {"name": "data", "type": "bytes"},
          {"name": "tokenAmounts", "type": "tuple[]", "components": [
            {"name": "token", "type": "address"},
            {"name": "amount", "type": "uint256"}
          ]},
          {"name": "feeToken", "type": "address"},
          {"name": "extraArgs", "type": "bytes"}
        ]
      }
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  }
];

const ERC20_ABI = [
  {
    "name": "approve",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}]
  },
  {
    "name": "allowance",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "name": "balanceOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {"name": "account", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}]
  }
];

// Test tokens on Arbitrum Sepolia
const TEST_TOKENS = {
  'CCIP-BnM': '0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D',
  'USDC': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
};

// Contract addresses
const ARBITRUM_SEPOLIA_ROUTER = '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165';
const BASE_SEPOLIA_SELECTOR = '10344971235874465080';

const CCIPToolsDemo = () => {
  // ===== ALL STATE VARIABLES FIRST =====
  const [tokenAddress, setTokenAddress] = useState('0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'); // Default to USDC
  const [amount, setAmount] = useState('1');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [currentChain, setCurrentChain] = useState({ id: null, name: 'Unknown' });
  const [step, setStep] = useState('idle'); // 'idle', 'checking', 'approving', 'approved', 'getting-fee', 'transferring', 'completed'
  
  // ===== ALL HOOKS SECOND =====
  const { client } = useSmartAccountClient({});

  // Setup user operations for approval and CCIP transfer
  const approveOperation = useSendUserOperation({
    client,
    waitForTxn: true,
    onSuccess: () => {
      console.log('✅ Token approval successful');
      setStep('approved');
    },
    onError: (error) => {
      console.error('❌ Approval failed:', error);
      setStep('idle');
    },
  });

  const ccipOperation = useSendUserOperation({
    client,
    waitForTxn: true,
    onSuccess: () => {
      console.log('✅ CCIP transfer successful');
      setStep('completed');
    },
    onError: (error) => {
      console.error('❌ CCIP transfer failed:', error);
      setStep('idle');
    },
  });

  // ===== CHAIN DETECTION useEffect =====
  useEffect(() => {
    const getCurrentChain = async () => {
      if (client) {
        try {
          const chainIdResponse = await client.request({
            method: 'eth_chainId'
          });
          
          // FIXED: Use decimal parsing since Account Kit returns decimal
          const chainIdDecimal = parseInt(chainIdResponse, 10);
          
          console.log('✅ Chain ID (correct):', chainIdDecimal);
          
          if (chainIdDecimal === 421614) {
            setCurrentChain({ id: chainIdDecimal, name: 'Arbitrum Sepolia' });
          } else {
            setCurrentChain({ id: chainIdDecimal, name: `Unsupported Chain (${chainIdDecimal})` });
          }
        } catch (error) {
          console.error('Failed to get current chain:', error);
          setCurrentChain({ id: null, name: 'Unknown' });
        }
      }
    };

    getCurrentChain();
  }, [client]);

  // ===== ALL DERIVED STATE THIRD =====
  const isProcessing = step !== 'idle' && step !== 'completed';
  const isCorrectChain = currentChain.id === 421614;

  // Get token info for conversions
  const getSelectedTokenInfo = () => {
    const isUSDC = tokenAddress === '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
    return {
      name: isUSDC ? 'USDC' : 'CCIP-BnM',
      decimals: isUSDC ? 6 : 18,
      symbol: isUSDC ? 'USDC' : 'CCIP-BnM'
    };
  };

  // Convert user amount to wei/smallest unit
  const convertToWei = (userAmount: string) => {
    const tokenInfo = getSelectedTokenInfo();
    try {
      const parsedAmount = parseFloat(userAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }
      // Convert to smallest unit (multiply by 10^decimals)
      const weiAmount = BigInt(Math.floor(parsedAmount * Math.pow(10, tokenInfo.decimals)));
      return weiAmount;
    } catch (error) {
      throw new Error('Please enter a valid amount');
    }
  };

  // Convert wei back to user-friendly amount (for display)
  const convertFromWei = (weiAmount: bigint) => {
    const tokenInfo = getSelectedTokenInfo();
    const divisor = Math.pow(10, tokenInfo.decimals);
    return (Number(weiAmount) / divisor).toString();
  };

  // Handle token selection change - reset amount to appropriate default
  const handleTokenChange = (newTokenAddress: string) => {
    setTokenAddress(newTokenAddress);
    // Reset to clean default amount
    setAmount('1'); // Simple "1" for both USDC and CCIP-BnM
  };

  const executeCCIPTransfer = async () => {
    if (!client) return;

    try {
      setStep('getting-fee');

      // Import viem utilities for proper encoding (following official CCIP tools pattern)
      const { pad } = await import('viem');

      // Convert user amount to wei
      const weiAmount = convertToWei(amount);

      // Prepare CCIP message with PROPER encoding (based on official tools)
      const ccipMessage = {
        receiver: pad(destinationAccount as `0x${string}`, { size: 32 }), // 32-byte zero-padded like official tools
        data: '0x', // Empty data for simple token transfer
        tokenAmounts: [{
          token: tokenAddress,
          amount: weiAmount
        }],
        feeToken: '0x0000000000000000000000000000000000000000', // Pay in native ETH
        extraArgs: '0x' // Will add proper extraArgs encoding if needed
      };

      console.log('CCIP Message (corrected):', ccipMessage);

      // Get fee estimate
      const fee = await client.readContract({
        address: ARBITRUM_SEPOLIA_ROUTER,
        abi: CCIP_ROUTER_ABI,
        functionName: 'getFee',
        args: [BigInt(BASE_SEPOLIA_SELECTOR), ccipMessage],
      });

      console.log('Estimated fee:', fee.toString());

      // Send CCIP transaction
      setStep('transferring');
      
      ccipOperation.sendUserOperation({
        uo: {
          target: ARBITRUM_SEPOLIA_ROUTER,
          data: encodeFunctionData({
            abi: CCIP_ROUTER_ABI,
            functionName: 'ccipSend',
            args: [BigInt(BASE_SEPOLIA_SELECTOR), ccipMessage],
          }),
          value: fee,
        },
      });

    } catch (error) {
      console.error('CCIP execution failed:', error);
      setStep('idle');
      alert(`CCIP transfer failed: ${error.message}`);
    }
  };

  const handleTransfer = async () => {
    if (!destinationAccount) {
      alert('Please enter a destination account');
      return;
    }

    // Validate destination address format
    if (!destinationAccount.startsWith('0x') || destinationAccount.length !== 42) {
      alert('Please enter a valid Ethereum address (0x...)');
      return;
    }

    if (!client) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setStep('checking');

      // Convert user amount to wei for contract calls
      const weiAmount = convertToWei(amount);

      // Step 1: Check token balance
      const balance = await client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [client.getAddress()],
      });

      console.log('Token balance:', balance.toString());
      
      if (balance < weiAmount) {
        const tokenInfo = getSelectedTokenInfo();
        const userBalance = convertFromWei(balance);
        alert(`Insufficient token balance. You have ${userBalance} ${tokenInfo.symbol}`);
        setStep('idle');
        return;
      }

      // Step 2: Check allowance
      const allowance = await client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [client.getAddress(), ARBITRUM_SEPOLIA_ROUTER],
      });

      console.log('Current allowance:', allowance.toString());

      // Step 3: Approve tokens if needed
      if (allowance < weiAmount) {
        console.log('Approving tokens...');
        setStep('approving');

        approveOperation.sendUserOperation({
          uo: {
            target: tokenAddress,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [ARBITRUM_SEPOLIA_ROUTER, weiAmount],
            }),
          },
        });

        // Wait for approval to complete - the onSuccess callback will continue
        return;
      }

      // Step 4: If already approved, proceed with CCIP transfer
      await executeCCIPTransfer();

    } catch (error) {
      console.error('Transfer failed:', error);
      setStep('idle');
      alert(`Transfer failed: ${error.message}`);
    }
  };

  const getButtonText = () => {
    switch (step) {
      case 'checking': return 'Checking Balance...';
      case 'approving': return 'Approving Tokens...';
      case 'approved': return 'Approval Complete!';
      case 'getting-fee': return 'Getting Fee Estimate...';
      case 'transferring': return 'Sending CCIP Transfer...';
      case 'completed': return 'Transfer Complete!';
      default: return 'Send CCIP Transfer';
    }
  };

  const getCCIPExplorerUrl = () => {
    const result = ccipOperation.sendUserOperationResult;
    if (!result?.hash) return undefined;
    return `https://ccip.chain.link/#/side-drawer/msg/${result.hash}`;
  };

  // ===== EFFECT TO CONTINUE AFTER APPROVAL =====
  useEffect(() => {
    if (step === 'approved') {
      executeCCIPTransfer();
    }
  }, [step]);

  // ===== RENDER =====
  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white rounded-2xl shadow-xl border border-blue-200 p-8 mt-6 relative overflow-hidden">
      {/* Dual brand background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-8 right-8 w-40 h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-2xl"></div>
        <div className="absolute bottom-8 left-8 w-32 h-32 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full blur-lg"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-100">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6" fill="#375BD2"/>
              <path d="M8 12C8 10.8954 8.89543 10 10 10H14C15.1046 10 16 10.8954 16 12V14C16 15.1046 15.1046 16 14 16H10C8.89543 16 8 15.1046 8 14V12Z" fill="white"/>
              <path d="M8 18C8 16.8954 8.89543 16 10 16H14C15.1046 16 16 16.8954 16 18V20C16 21.1046 15.1046 22 14 22H10C8.89543 22 8 21.1046 8 20V18Z" fill="white"/>
              <path d="M18 12C18 10.8954 18.8954 10 20 10H24C25.1046 10 26 10.8954 26 12V14C26 15.1046 25.1046 16 24 16H20C18.8954 16 18 15.1046 18 14V12Z" fill="white"/>
              <path d="M18 18C18 16.8954 18.8954 16 20 16H24C25.1046 16 26 16.8954 26 18V20C26 21.1046 25.1046 22 24 22H20C18.8954 22 18 21.1046 18 20V18Z" fill="white"/>
              <circle cx="17" cy="13" r="1" fill="#375BD2"/>
              <circle cx="15" cy="13" r="1" fill="#375BD2"/>
              <circle cx="17" cy="19" r="1" fill="#375BD2"/>
              <circle cx="15" cy="19" r="1" fill="#375BD2"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-900 bg-clip-text text-transparent">
            CCIP Transfer: Arbitrum Sepolia → Base Sepolia
          </h2>
        </div>
      
        <div className="space-y-6">
          {/* Chain Status - HIDDEN */}
          <div className={`hidden border rounded-lg p-4 ${isCorrectChain ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="font-semibold mb-2">Network Status</h3>
            <div className="space-y-1">
              <p><strong>Current Chain:</strong> {currentChain.name} {currentChain.id && `(ID: ${currentChain.id})`}</p>
              <p><strong>Source:</strong> Arbitrum Sepolia (Required)</p>
              <p><strong>Destination:</strong> Base Sepolia</p>
            </div>
            {isCorrectChain && (
              <p className="text-green-600 text-sm mt-2">
                ✅ Connected to the correct network!
              </p>
            )}
            {!isCorrectChain && (
              <p className="text-red-600 text-sm mt-2">
                ⚠️ Please connect to Arbitrum Sepolia to use this demo
              </p>
            )}
          </div>

          {/* Token Selection */}
          <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Token to Transfer
            </label>
            <select
              value={tokenAddress}
              onChange={(e) => handleTokenChange(e.target.value)}
              className="w-full p-4 border-2 border-blue-200 rounded-xl bg-white text-gray-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              disabled={isProcessing}
            >
              {Object.entries(TEST_TOKENS).map(([name, address]) => (
                <option key={address} value={address}>
                  {name} ({address})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Amount ({getSelectedTokenInfo().symbol})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1"
              className="w-full p-4 border-2 border-blue-200 rounded-xl bg-white text-gray-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              disabled={isProcessing}
            />
            <p className="text-sm text-gray-600 mt-2 bg-blue-50 p-3 rounded-lg">
              Enter amount in {getSelectedTokenInfo().symbol} (supports decimals like {getSelectedTokenInfo().name === 'USDC' ? '1.50 or 0.25' : '1.5 or 0.1'})
            </p>
          </div>

          {/* Destination Account */}
          <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Destination Account (Base Sepolia)
            </label>
            <input
              type="text"
              value={destinationAccount}
              onChange={(e) => setDestinationAccount(e.target.value)}
              placeholder="0x... (recipient address on Base Sepolia)"
              className="w-full p-4 border-2 border-blue-200 rounded-xl bg-white text-gray-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              disabled={isProcessing}
            />
          </div>

          {/* Transfer Button */}
          <div className="pt-4">
            <Button
              onClick={handleTransfer}
              disabled={!isCorrectChain || isProcessing}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
            >
              {getButtonText()}
            </Button>
          </div>

          {/* Error Display */}
          {(approveOperation.error || ccipOperation.error) && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-lg">⚠️</span>
                </div>
                <div>
                  <strong className="font-semibold">Error:</strong> {approveOperation.error?.message || ccipOperation.error?.message}
                </div>
              </div>
            </div>
          )}

          {/* Success Display */}
          {step === 'completed' && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 text-green-800 px-6 py-4 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-green-600 text-lg">🎉</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-2">Cross-Chain Transfer Successful!</h4>
                  <div className="space-y-2 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-green-200">
                      <p><strong>Transaction Hash:</strong> <span className="font-mono text-xs break-all">{ccipOperation.sendUserOperationResult?.hash}</span></p>
                    </div>
                    <p className="text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                      🕒 Tokens should arrive on Base Sepolia in ~10-20 minutes via Chainlink CCIP
                    </p>
                    {getCCIPExplorerUrl() && (
                      <p>
                        <a 
                          href={getCCIPExplorerUrl()} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline font-medium bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                        >
                          🔍 View on CCIP Explorer
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step Display for Debugging */}
          {isProcessing && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium text-blue-800">Processing: {step}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CCIPToolsDemo;