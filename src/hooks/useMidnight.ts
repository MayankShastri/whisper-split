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
  resetSettlementState: () => void;
};

import { useState, useCallback } from 'react';

const getLaceWallet = () => {
  if (typeof window === 'undefined') return undefined;
  const midnight = (window as any).midnight;
  if (!midnight) return undefined;
  if (midnight.mnLace) return midnight.mnLace;
  return Object.values(midnight).find(
    (w: any) => !!w && typeof w === 'object' && typeof w.connect === 'function'
  );
};

export const useMidnight = (): MidnightState => {
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whisper_split_wallet') || null;
    }
    return null;
  });
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Persistent settlement state across refreshes
  const [settled, setSettled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whisper_split_settled') === 'true';
    }
    return false;
  });

  const [settlementCount, setSettlementCount] = useState<bigint>(() => {
    if (typeof window !== 'undefined') {
      const savedCount = localStorage.getItem('whisper_split_count');
      return savedCount ? BigInt(savedCount) : 0n;
    }
    return 0n;
  });

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    const wallet = getLaceWallet();
    if (!wallet) {
      setIsConnecting(false);
      setError('Lace wallet extension not found. Please ensure Lace is installed, unlocked, and enabled.');
      return;
    }

    try {
      const connectedApi = await wallet.connect('preprod');

      let address: string | null = null;
      try {
        const unshielded = await connectedApi.getUnshieldedAddress();
        address = typeof unshielded === 'string' ? unshielded : unshielded?.unshieldedAddress;
      } catch {
        try {
          const shielded = await connectedApi.getShieldedAddresses();
          address = typeof shielded === 'string' ? shielded : shielded?.shieldedAddress;
        } catch {
          address = null;
        }
      }

      if (!address || typeof address !== 'string') {
        address = 'mn_addr_preprod_connected';
      }

      setWalletAddress(address);
      if (typeof window !== 'undefined') {
        localStorage.setItem('whisper_split_wallet', address);
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Network ID mismatch')) {
        setError('Network mismatch: Please set your Lace wallet network to "Preprod" in Lace Settings.');
      } else if (msg.includes('User rejected') || msg.includes('Rejected')) {
        setError('Connection request was declined in Lace.');
      } else {
        setError(msg || 'Failed to connect to Lace wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('whisper_split_wallet');
    }
  }, []);

  const settle = useCallback(async (_amount: bigint): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    setSettled(true);
    setSettlementCount((prev) => {
      const newCount = prev + 1n;
      if (typeof window !== 'undefined') {
        localStorage.setItem('whisper_split_settled', 'true');
        localStorage.setItem('whisper_split_count', newCount.toString());
      }
      return newCount;
    });
    return true;
  }, []);

  const resetSettlementState = useCallback(() => {
    setSettled(false);
    setSettlementCount(0n);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('whisper_split_settled');
      localStorage.removeItem('whisper_split_count');
    }
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
    resetSettlementState,
  };
};
