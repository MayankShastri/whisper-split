export type MidnightState = {
  walletAddress: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  settled: boolean;
  settlementCount: bigint;
  connect: () => Promise<void>;
  disconnect: () => void;
  settle: (amount: bigint) => Promise<boolean>;
};

import { useState, useCallback } from 'react';

export const useMidnight = (): MidnightState => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState<boolean>(false);
  const [settlementCount, setSettlementCount] = useState<bigint>(0n);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setWalletAddress('mn_addr_preprod1qq8x4p7w93kz0h6a5vg7lm892');
    } catch (err: any) {
      setError(err?.message || 'Failed to connect Lace wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setError(null);
  }, []);

  const settle = useCallback(async (_amount: bigint): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    setSettled(true);
    setSettlementCount((prev) => prev + 1n);
    return true;
  }, []);

  return {
    walletAddress,
    isConnecting,
    isConnected: !!walletAddress,
    error,
    settled,
    settlementCount,
    connect,
    disconnect,
    settle,
  };
};
