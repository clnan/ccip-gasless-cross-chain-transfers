// lib/hooks/useCCIPTools.js
"use client";

import { useState, useCallback } from 'react';
import { useSmartAccountClient } from '@account-kit/react';
import * as CCIP from '@chainlink/ccip-js';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { mainnet, sepolia, polygon, polygonMumbai, avalanche, avalancheFuji } from 'viem/chains';

// Chain configurations with CCIP selectors
const CCIP_CHAINS = {
  sepolia: {
    chain: sepolia,
    selector: '16015286601757825753',
    router: '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59'
  },
  mumbai: {
    chain: polygonMumbai,
    selector: '12532609583862916517',
    router: '0x1035CabC275068e0F4b745A29CEDf38E13aF41b1'
  },
  fuji: {
    chain: avalancheFuji,
    selector: '14767482510784806043',
    router: '0xF694E193200268f9a4868e4Aa017A0118C9a8177'
  }
};

export const useCCIPTools = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const { client: smartAccountClient } = useSmartAccountClient({});

  const sendCCIPTransfer = useCallback(async ({
    destinationChain,
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
      // Get current chain info
      const currentChainId = await smartAccountClient.request({
        method: 'eth_chainId'
      });
      const chainIdDecimal = parseInt(currentChainId, 16);
      
      // Find current chain config
      const currentChainConfig = Object.values(CCIP_CHAINS).find(
        config => config.chain.id === chainIdDecimal
      );

      if (!currentChainConfig) {
        throw new Error(`Current chain (${chainIdDecimal}) not supported by CCIP`);
      }

      const destinationConfig = CCIP_CHAINS[destinationChain];
      if (!destinationConfig) {
        throw new Error('Destination chain not supported');
      }

      // Create CCIP client
      const ccipClient = CCIP.createClient();

      // Create public and wallet clients
      const publicClient = createPublicClient({
        chain: currentChainConfig.chain,
        transport: custom(smartAccountClient)
      });

      const walletClient = createWalletClient({
        chain: currentChainConfig.chain,
        transport: custom(smartAccountClient)
      });

      // First, approve the router to spend tokens
      console.log('Approving router to spend tokens...');
      const approvalResult = await ccipClient.approveRouter({
        client: walletClient,
        routerAddress: currentChainConfig.router,
        tokenAddress: tokenAddress,
        amount: BigInt(amount),
        waitForReceipt: true
      });

      console.log('Approval successful:', approvalResult.txHash);

      // Get fee estimate
      console.log('Getting fee estimate...');
      const fee = await ccipClient.getFee({
        client: publicClient,
        routerAddress: currentChainConfig.router,
        tokenAddress: tokenAddress,
        amount: BigInt(amount),
        destinationAccount: destinationAccount,
        destinationChainSelector: destinationConfig.selector
      });

      console.log('Estimated fee:', fee.toString());

      // Transfer tokens
      console.log('Initiating CCIP transfer...');
      const transferResult = await ccipClient.transferTokens({
        client: walletClient,
        routerAddress: currentChainConfig.router,
        tokenAddress: tokenAddress,
        amount: BigInt(amount),
        destinationAccount: destinationAccount,
        destinationChainSelector: destinationConfig.selector
      });

      console.log('Transfer successful:', transferResult);

      const finalResult = {
        approvalHash: approvalResult.txHash,
        transferHash: transferResult.txHash,
        messageId: transferResult.messageId,
        fee: fee.toString()
      };

      setResult(finalResult);
      return finalResult;

    } catch (err) {
      console.error('CCIP transfer failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [smartAccountClient]);

  const checkAllowance = useCallback(async (tokenAddress, routerAddress) => {
    if (!smartAccountClient) return '0';

    try {
      const ccipClient = CCIP.createClient();
      const currentChainId = await smartAccountClient.request({
        method: 'eth_chainId'
      });
      const chainIdDecimal = parseInt(currentChainId, 16);
      
      const currentChainConfig = Object.values(CCIP_CHAINS).find(
        config => config.chain.id === chainIdDecimal
      );

      if (!currentChainConfig) return '0';

      const publicClient = createPublicClient({
        chain: currentChainConfig.chain,
        transport: custom(smartAccountClient)
      });

      const allowance = await ccipClient.getAllowance({
        client: publicClient,
        tokenAddress: tokenAddress,
        routerAddress: routerAddress,
        account: smartAccountClient.account?.address
      });

      return allowance.toString();
    } catch (err) {
      console.error('Failed to check allowance:', err);
      return '0';
    }
  }, [smartAccountClient]);

  return {
    sendCCIPTransfer,
    checkAllowance,
    isLoading,
    error,
    result,
    supportedChains: Object.keys(CCIP_CHAINS)
  };
};