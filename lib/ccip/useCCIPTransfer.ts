"use client";
// One hook for the whole transfer: balance check -> SDK-built calls -> one sponsored batch -> message ID.
// The smart-wallet specifics are isolated in `sendBatch` so the Alchemy Wallet APIs migration
// only has to replace that function.
import { useCallback, useState } from "react";
import { useSendUserOperation, useSmartAccountClient } from "@account-kit/react";
import { erc20Abi, formatUnits, isAddress, parseUnits, type Address, type Hex } from "viem";
import { buildTransferCalls, getMessageIds, type Call } from "./transfer";
import type { TransferToken } from "./config";

export type TransferStep = "idle" | "checking" | "preparing" | "sending" | "sent" | "error";

export function useCCIPTransfer() {
  const { client } = useSmartAccountClient({});
  const { sendUserOperationAsync } = useSendUserOperation({ client, waitForTxn: true });

  const [step, setStep] = useState<TransferStep>("idle");
  const [error, setError] = useState<string>();
  const [txHash, setTxHash] = useState<Hex>();
  const [messageId, setMessageId] = useState<string>();
  const [fee, setFee] = useState<bigint>();

  const sendBatch = useCallback(
    async (calls: Call[]): Promise<Hex> => {
      const { hash } = await sendUserOperationAsync({
        uo: calls.map((c) => ({ target: c.to, data: c.data, value: c.value })),
      });
      return hash;
    },
    [sendUserOperationAsync],
  );

  const transfer = useCallback(
    async ({ token, amount, receiver }: { token: TransferToken; amount: string; receiver: string }) => {
      setError(undefined);
      setTxHash(undefined);
      setMessageId(undefined);
      try {
        if (!client) throw new Error("Connect your wallet first.");
        if (!isAddress(receiver)) throw new Error("Enter a valid destination address (0x…).");
        const value = parseUnits(amount, token.decimals);
        if (value <= 0n) throw new Error("Enter an amount greater than 0.");
        const sender = client.getAddress() as Address;

        setStep("checking");
        const [balance, native] = await Promise.all([
          client.readContract({ address: token.address, abi: erc20Abi, functionName: "balanceOf", args: [sender] }),
          client.getBalance({ address: sender }),
        ]);
        if (balance < value) {
          throw new Error(`Insufficient balance: you have ${formatUnits(balance, token.decimals)} ${token.symbol}.`);
        }

        setStep("preparing");
        const built = await buildTransferCalls({ token: token.address, amount: value, receiver, sender });
        setFee(built.fee);
        // Gas is sponsored, but the CCIP fee is paid in native ETH by the smart account.
        if (native < built.fee) {
          throw new Error(
            `The CCIP fee is ${formatUnits(built.fee, 18)} ETH, paid from your smart account ` +
              `(gas is sponsored, the CCIP fee isn't). Fund ${sender} with Arbitrum Sepolia ETH.`,
          );
        }

        setStep("sending");
        const hash = await sendBatch(built.calls);
        setTxHash(hash);
        setStep("sent");

        const [id] = await getMessageIds(hash);
        setMessageId(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStep("error");
      }
    },
    [client, sendBatch],
  );

  const reset = useCallback(() => {
    setStep("idle");
    setError(undefined);
    setTxHash(undefined);
    setMessageId(undefined);
    setFee(undefined);
  }, []);

  return { transfer, reset, step, error, txHash, messageId, fee, ready: !!client };
}
