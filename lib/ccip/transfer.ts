// Wallet-agnostic CCIP helpers built on @chainlink/ccip-sdk.
// They produce plain {to, data, value} calls so any smart-wallet stack can batch and sponsor them
// (Account Kit today, Alchemy Wallet APIs `sendCalls` next).
import { createPublicClient, http, type Address, type Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { fromViemClient } from "./sdk";
import { CCIPAPIClient, type EVMChain } from "./sdk";
import { DEST_NETWORK, SOURCE_ROUTER, sourceRpcUrl } from "./config";

export type Call = { to: Address; data: Hex; value: bigint };

export type TransferParams = {
  token: Address;
  amount: bigint;
  receiver: Address;
};

let sourceChain: Promise<EVMChain> | undefined;

/** Memoized SDK chain instance for the source network. */
export function getSourceChain(): Promise<EVMChain> {
  sourceChain ??= fromViemClient(
    createPublicClient({ chain: arbitrumSepolia, transport: http(sourceRpcUrl()) }),
  );
  return sourceChain;
}

export const ccipApi = () => CCIPAPIClient.fromUrl();

// extraArgs are omitted on purpose: the SDK fills lane-appropriate defaults
// (gasLimit 0 for token-only messages; V2 args on 1.x lanes, GenericExtraArgsV3 on CCIP 2.0 lanes).
const toMessage = ({ token, amount, receiver }: TransferParams) => ({
  receiver,
  tokenAmounts: [{ token, amount }],
});

/** Fee in native gas token (wei) for the transfer. */
export async function quoteFee(params: TransferParams): Promise<bigint> {
  const chain = await getSourceChain();
  return chain.getFee({
    router: SOURCE_ROUTER,
    destChainSelector: DEST_NETWORK.chainSelector,
    message: toMessage(params),
  });
}

/**
 * Builds the calls for one sponsored batch: any needed ERC-20 approvals followed by ccipSend.
 * The SDK checks the sender's current allowance and only adds approvals when required.
 */
export async function buildTransferCalls(
  params: TransferParams & { sender: Address; fee?: bigint },
): Promise<{ fee: bigint; calls: Call[] }> {
  const chain = await getSourceChain();
  const fee = params.fee ?? (await quoteFee(params));
  const unsigned = await chain.generateUnsignedSendMessage({
    router: SOURCE_ROUTER,
    destChainSelector: DEST_NETWORK.chainSelector,
    message: { ...toMessage(params), fee },
    sender: params.sender,
  });
  const calls = unsigned.transactions.map((tx) => ({
    to: tx.to as Address,
    data: tx.data as Hex,
    value: tx.value != null ? BigInt(tx.value) : 0n,
  }));
  return { fee, calls };
}

/** CCIP message IDs emitted by a source-chain transaction (reads logs via RPC, falls back to the CCIP API). */
export async function getMessageIds(txHash: Hex): Promise<string[]> {
  try {
    const chain = await getSourceChain();
    const requests = await chain.getMessagesInTx(txHash);
    return requests.map((r) => r.message.messageId);
  } catch {
    return ccipApi().getMessageIdsInTx(txHash);
  }
}
