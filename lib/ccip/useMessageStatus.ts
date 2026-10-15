"use client";
// Polls the CCIP API (v2) for a message's lifecycle status until it reaches a final state.
import { useEffect, useState } from "react";
import { MessageStatus } from "./sdk";
import { ccipApi } from "./transfer";

const FINAL: string[] = [MessageStatus.Success, MessageStatus.Failed];
const POLL_MS = 15_000;

export function useMessageStatus(messageId: string | undefined) {
  const [status, setStatus] = useState<string>();

  useEffect(() => {
    if (!messageId) {
      setStatus(undefined);
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const req = await ccipApi().getMessageById(messageId, { signal: controller.signal });
        setStatus(req.metadata.status);
        if (FINAL.includes(req.metadata.status)) return;
      } catch {
        // Not indexed yet (404) or transient error: keep showing the last known state.
        setStatus((s) => s ?? MessageStatus.Sent);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, POLL_MS);
    };
    poll();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [messageId]);

  return status;
}
