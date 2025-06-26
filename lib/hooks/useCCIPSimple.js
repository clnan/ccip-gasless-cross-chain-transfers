// lib/hooks/useCCIPSimple.js
"use client";

import { useState, useCallback } from 'react';
import { useSmartAccountClient } from '@account-kit/react';
import { ethers } from 'ethers';

// Simplified for Arbitrum Sepolia → Base Sepolia
const ARBITRUM_SEPOLIA = {
  chainId: 421614,
  name: 'Arbitrum Sepolia',
  selector: '3478487238524512106',
  router: '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165'
};

const BASE_SEPOLIA = {
  chainId: 84532,
  name: 'Base Sepolia',
  selector: '10344971235874465080'
};

export const useCCIPSimple = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { client: smartAccountClient } = useSmartAccountClient({});

  const sendCCIPTransfer = useCallback(async ({
    tokenAddress,
    amount,
    destinationAccount
  }) => {
    if (!smartAccountClient) {
      throw new Error('Smart account client not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify we're on Arbitrum Sepolia
      const chainIdResponse = await smartAccountClient.request({
        method: 'eth_chainId'
      });
      
      let chainIdDecimal;
      if (typeof chainIdResponse === 'string' && chainIdResponse.startsWith('0x')) {
        // It's hex, convert to decimal
        chainIdDecimal = parseInt(chainIdResponse, 16);
      } else {
        // It's already decimal, just convert to number
        chainIdDecimal = parseInt(chainIdResponse, 10);
      }
      
      console.log('Hook - Chain ID response:', chainIdResponse);
      console.log('Hook - Chain ID decimal:', chainIdDecimal);
      console.log('Hook - Expected chain ID:', ARBITRUM_SEPOLIA.chainId);
      
      if (chainIdDecimal !== ARBITRUM_SEPOLIA.chainId) {
        throw new Error(`Please connect to ${ARBITRUM_SEPOLIA.name} (Chain ID: ${ARBITRUM_SEPOLIA.chainId})`);
      }

      // Create provider and signer
      const provider = new ethers.providers.Web3Provider(smartAccountClient);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      console.log('Starting CCIP transfer from', userAddress);

      // Contract ABIs
      const routerABI = [
        "function ccipSend(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) external payable returns (bytes32)",
        "function getFee(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) external view returns (uint256)"
      ];

      const erc20ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function balanceOf(address account) external view returns (uint256)"
      ];

      // Create contract instances
      const routerContract = new ethers.Contract(ARBITRUM_SEPOLIA.router, routerABI, signer);
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);

      // Check token balance
      const balance = await tokenContract.balanceOf(userAddress);
      if (balance.lt(amount)) {
        throw new Error(`Insufficient token balance. You have ${ethers.utils.formatEther(balance)} tokens`);
      }

      // Check and approve tokens
      const currentAllowance = await tokenContract.allowance(userAddress, ARBITRUM_SEPOLIA.router);
      if (currentAllowance.lt(amount)) {
        console.log('Approving tokens...');
        const approveTx = await tokenContract.approve(ARBITRUM_SEPOLIA.router, amount);
        console.log('Approval transaction:', approveTx.hash);
        await approveTx.wait();
        console.log('Tokens approved successfully');
      }

      // Prepare CCIP message
      const message = {
        receiver: ethers.utils.solidityPack(['address'], [destinationAccount]),
        data: '0x',
        tokenAmounts: [{
          token: tokenAddress,
          amount: amount
        }],
        feeToken: ethers.constants.AddressZero, // Pay in native ETH
        extraArgs: '0x'
      };

      // Get fee estimate
      console.log('Getting fee estimate...');
      const fee = await routerContract.getFee(BASE_SEPOLIA.selector, message);
      console.log('Estimated fee:', ethers.utils.formatEther(fee), 'ETH');

      // Check ETH balance for fees
      const ethBalance = await provider.getBalance(userAddress);
      if (ethBalance.lt(fee)) {
        throw new Error(`Insufficient ETH for fees. Need ${ethers.utils.formatEther(fee)} ETH`);
      }

      // Send CCIP transaction
      console.log('Sending CCIP transaction...');
      const ccipTx = await routerContract.ccipSend(BASE_SEPOLIA.selector, message, {
        value: fee,
        gasLimit: 500000 // Set a reasonable gas limit
      });

      console.log('CCIP transaction sent:', ccipTx.hash);
      const receipt = await ccipTx.wait();
      console.log('Transaction confirmed');

      // Try to extract message ID from receipt
      let messageId = null;
      try {
        // Look for CCIPSendRequested event
        const ccipSendTopic = ethers.utils.id('CCIPSendRequested(tuple(bytes32,uint64,bytes,bytes,tuple(address,uint256)[],address,bytes))');
        const log = receipt.logs.find(log => log.topics[0] === ccipSendTopic);
        if (log) {
          // Message ID is typically the first field in the message struct
          messageId = log.topics[1];
        }
      } catch (e) {
        console.log('Could not extract message ID from receipt');
      }

      return {
        transactionHash: ccipTx.hash,
        messageId: messageId,
        fee: ethers.utils.formatEther(fee),
        blockNumber: receipt.blockNumber
      };

    } catch (err) {
      console.error('CCIP transfer failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [smartAccountClient]);

  return {
    sendCCIPTransfer,
    isLoading,
    error,
    supportedSourceChain: ARBITRUM_SEPOLIA,
    supportedDestinationChain: BASE_SEPOLIA
  };
};