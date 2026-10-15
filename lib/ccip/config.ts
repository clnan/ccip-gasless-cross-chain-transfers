// Single source of truth for the CCIP lane this demo uses.
// Chain selectors come from the CCIP SDK's network registry instead of being hard-coded.
import { getCCIPExplorerUrl, networkInfo } from "./sdk";
import type { Address } from "viem";

export const SOURCE_NETWORK = networkInfo("ethereum-testnet-sepolia-arbitrum-1");
export const DEST_NETWORK = networkInfo("ethereum-testnet-sepolia-base-1");

/** CCIP Router on Arbitrum Sepolia (see docs.chain.link/ccip/directory/testnet). */
export const SOURCE_ROUTER: Address = "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165";

/** Alchemy RPC for the source chain; the SDK reads fees, allowances and logs through it. */
export const sourceRpcUrl = () =>
  `https://arb-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

export type TransferToken = {
  symbol: string;
  address: Address;
  decimals: number;
};

export const TRANSFER_TOKENS: TransferToken[] = [
  { symbol: "USDC", address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", decimals: 6 },
  { symbol: "CCIP-BnM", address: "0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D", decimals: 18 },
];

/** CCIP Explorer deep link for a message ID (not a tx or user-op hash). */
export const ccipExplorerUrl = (messageId: string) => getCCIPExplorerUrl("msg", messageId);
