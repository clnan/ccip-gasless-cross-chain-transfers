// lib/hooks/useCCIP.js
"use client";

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useSmartAccountClient } from '@account-kit/react';
import { CCIP_CONFIG, CCIP_ROUTER_ABI } from '../ccip';

export const useCCIP = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { client } = useSmartAccountClient({});  // Added empty object parameter

  const sendCrossChainMessage = useCallback(async ({
    destinationChain,
    receiverAddress,
    message,
    tokenAmount = 0
  }) => {
    if (!client) {
      throw new Error('Smart account client not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current chain config
      const currentChainId = await client.request({
        method: 'eth_chainId'
      });
      
      const currentChain = Object.values(CCIP_CONFIG).find(
        chain => chain.chainId === parseInt(currentChainId, 16)
      );

      if (!currentChain) {
        throw new Error('Current chain not supported by CCIP');
      }

      const destinationConfig = CCIP_CONFIG[destinationChain];
      if (!destinationConfig) {
        throw new Error('Destination chain not supported');
      }

      // Create router contract interface
      const routerContract = new ethers.Contract(
        currentChain.router,
        CCIP_ROUTER_ABI,
        client
      );

      // Prepare CCIP message
      const ccipMessage = {
        receiver: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(receiverAddress)),
        data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message)),
        tokenAmounts: [], // No tokens for simple message
        feeToken: ethers.constants.AddressZero, // Pay in native token
        extraArgs: "0x" // Default extra args
      };

      // Get fee estimate
      const fee = await routerContract.getFee(
        destinationConfig.chainSelector,
        ccipMessage
      );

      console.log('Estimated fee:', ethers.utils.formatEther(fee), 'ETH');

      // Send transaction using Account Kit
      const txHash = await client.sendTransaction({
        to: currentChain.router,
        data: routerContract.interface.encodeFunctionData('ccipSend', [
          destinationConfig.chainSelector,
          ccipMessage
        ]),
        value: fee.toString()
      });

      console.log('CCIP transaction sent:', txHash);
      return txHash;

    } catch (err) {
      console.error('CCIP transaction failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const getSupportedTokens = useCallback(async (destinationChain) => {
    if (!client) return [];

    try {
      const currentChainId = await client.request({
        method: 'eth_chainId'
      });
      
      const currentChain = Object.values(CCIP_CONFIG).find(
        chain => chain.chainId === parseInt(currentChainId, 16)
      );

      if (!currentChain) return [];

      const destinationConfig = CCIP_CONFIG[destinationChain];
      if (!destinationConfig) return [];

      const routerContract = new ethers.Contract(
        currentChain.router,
        CCIP_ROUTER_ABI,
        client
      );

      const tokens = await routerContract.getSupportedTokens(
        destinationConfig.chainSelector
      );

      return tokens;
    } catch (err) {
      console.error('Failed to get supported tokens:', err);
      return [];
    }
  }, [client]);

  return {
    sendCrossChainMessage,
    getSupportedTokens,
    isLoading,
    error,
    supportedChains: Object.keys(CCIP_CONFIG)
  };
};