// components/ui/ccip-demo.tsx
"use client";

import React, { useState } from 'react';
import { useCCIP } from '../../lib/hooks/useCCIP';
import { Button } from './button';
import { Card } from './card';

const CCIPDemo = () => {
  const [destinationChain, setDestinationChain] = useState('mumbai');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [message, setMessage] = useState('Hello from Account Kit + CCIP!');
  const [txHash, setTxHash] = useState('');

  const { 
    sendCrossChainMessage, 
    getSupportedTokens, 
    isLoading, 
    error, 
    supportedChains 
  } = useCCIP();

  const handleSendMessage = async () => {
    if (!receiverAddress) {
      alert('Please enter a receiver address');
      return;
    }

    try {
      const hash = await sendCrossChainMessage({
        destinationChain,
        receiverAddress,
        message
      });
      setTxHash(hash);
    } catch (err) {
      console.error('Failed to send cross-chain message:', err);
    }
  };

  return (
    <Card className="p-6 mt-6">
      <h2 className="text-2xl font-bold mb-4">CCIP Cross-Chain Demo</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Destination Chain
          </label>
          <select
            value={destinationChain}
            onChange={(e) => setDestinationChain(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {supportedChains.map(chain => (
              <option key={chain} value={chain}>
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Receiver Address
          </label>
          <input
            type="text"
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
            placeholder="0x..."
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSendMessage}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Cross-Chain Message'}
        </Button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {txHash && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            Transaction sent! Hash: {txHash}
          </div>
        )}
      </div>
    </Card>
  );
};

export default CCIPDemo;