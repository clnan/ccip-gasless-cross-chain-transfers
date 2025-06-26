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
  const [amount, setAmount] = useState('1000000000000000000');
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

  // ===== ALL FUNCTIONS FOURTH =====
  const executeCCIPTransfer = async () => {
    if (!client) return;

    try {
      setStep('getting-fee');

      // Import viem utilities for proper encoding (following official CCIP tools pattern)
      const { pad, toHex } = await import('viem');

      // Prepare CCIP message with PROPER encoding (based on official tools)
      const ccipMessage = {
        receiver: pad(destinationAccount as `0x${string}`, { size: 32 }), // 32-byte zero-padded like official tools
        data: '0x', // Empty data for simple token transfer
        tokenAmounts: [{
          token: tokenAddress,
          amount: BigInt(amount)
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

      // Step 1: Check token balance
      const balance = await client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [client.getAddress()],
      });

      console.log('Token balance:', balance.toString());
      
      if (balance < BigInt(amount)) {
        alert(`Insufficient token balance. You have ${balance.toString()} tokens`);
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
      if (allowance < BigInt(amount)) {
        console.log('Approving tokens...');
        setStep('approving');

        approveOperation.sendUserOperation({
          uo: {
            target: tokenAddress,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [ARBITRUM_SEPOLIA_ROUTER, BigInt(amount)],
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

  const getTransactionUrl = () => {
    const result = ccipOperation.sendUserOperationResult || approveOperation.sendUserOperationResult;
    if (!client?.chain?.blockExplorers || !result?.hash) return undefined;
    return `${client.chain.blockExplorers.default.url}/tx/${result.hash}`;
  };

  // ===== EFFECT TO CONTINUE AFTER APPROVAL =====
  useEffect(() => {
    if (step === 'approved') {
      executeCCIPTransfer();
    }
  }, [step]); // Now step is properly defined above

  // ===== RENDER =====
  return (
    <Card className="p-6 mt-6">
      <h2 className="text-2xl font-bold mb-4">CCIP Transfer: Arbitrum Sepolia → Base Sepolia</h2>
      
      <div className="space-y-4">
        {/* Chain Status */}
        <div className={`border rounded-lg p-4 ${isCorrectChain ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
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
        <div>
          <label className="block text-sm font-medium mb-2">
            Token to Transfer
          </label>
          <select
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="w-full p-2 border rounded-md"
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
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (in wei)
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000000000000000"
            className="w-full p-2 border rounded-md"
            disabled={isProcessing}
          />
          <p className="text-xs text-gray-500 mt-1">
            Default: 1 token (for USDC: 1000000 = $1, for CCIP-BnM: 1000000000000000000 = 1 token)
          </p>
        </div>

        {/* Destination Account */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Destination Account (Base Sepolia)
          </label>
          <input
            type="text"
            value={destinationAccount}
            onChange={(e) => setDestinationAccount(e.target.value)}
            placeholder="0x... (recipient address on Base Sepolia)"
            className="w-full p-2 border rounded-md"
            disabled={isProcessing}
          />
        </div>

        {/* Transfer Button */}
        <Button
          onClick={handleTransfer}
          disabled={!isCorrectChain || isProcessing}
          className="w-full"
        >
          {getButtonText()}
        </Button>

        {/* Error Display */}
        {(approveOperation.error || ccipOperation.error) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {approveOperation.error?.message || ccipOperation.error?.message}
          </div>
        )}

        {/* Success Display */}
        {step === 'completed' && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <h4 className="font-bold">Cross-Chain Transfer Successful! 🎉</h4>
            <div className="mt-2 space-y-1 text-sm">
              <p><strong>Transaction Hash:</strong> {ccipOperation.sendUserOperationResult?.hash}</p>
              <p className="text-xs mt-2">
                Tokens should arrive on Base Sepolia in ~10-20 minutes
              </p>
              {getTransactionUrl() && (
                <p>
                  <a 
                    href={getTransactionUrl()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View on Explorer
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step Display for Debugging */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">Current Step: {step}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CCIPToolsDemo;