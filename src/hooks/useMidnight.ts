import { useState, useCallback } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

export type MidnightState = {
  walletAddress: string | null;
  walletName: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  connect: (preferredWallet: '1am' | 'mnLace') => Promise<void>;
  disconnect: () => void;
  getConnectedApi: () => ConnectedAPI | null;
};

let cachedConnectedApi: ConnectedAPI | null = null;

const getSpecificWallet = (key: '1am' | 'mnLace') => {
  if (typeof window === 'undefined') return undefined;
  const midnight = (window as any).midnight;
  if (!midnight) return undefined;

  if (key === '1am') {
    if (midnight['1am']) return midnight['1am'];
    return Object.values(midnight).find(
      (w: any) => !!w && typeof w === 'object' && ((w.name && w.name.toLowerCase().includes('1am')) || (w.rdns && w.rdns.includes('1am')))
    );
  }

  if (key === 'mnLace') {
    if (midnight.mnLace) return midnight.mnLace;
    return Object.values(midnight).find(
      (w: any) => !!w && typeof w === 'object' && ((w.name && w.name.toLowerCase().includes('lace')) || (w.rdns && w.rdns.includes('lace')))
    );
  }

  return undefined;
};

export const useMidnight = (): MidnightState => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (selectedKey: '1am' | 'mnLace') => {
    setIsConnecting(true);
    setError(null);

    const wallet = getSpecificWallet(selectedKey);
    const expectedName = selectedKey === '1am' ? '1AM Wallet' : 'Midnight Lace';

    if (!wallet) {
      setIsConnecting(false);
      setError(`${expectedName} extension not found in browser. Please install or enable it.`);
      return;
    }

    try {
      const displayName = wallet.name || expectedName;
      const connectedApi = await wallet.connect('preprod');
      cachedConnectedApi = connectedApi;

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
        throw new Error('Could not retrieve wallet address');
      }

      setWalletAddress(address);
      setWalletName(displayName);
    } catch (err: any) {
      cachedConnectedApi = null;
      const msg = err?.message || String(err);
      if (msg.includes('Network ID mismatch')) {
        setError(`Network mismatch: Please set ${expectedName} to "Preprod" in settings.`);
      } else if (msg.includes('User rejected') || msg.includes('Rejected')) {
        setError(`Connection request declined in ${expectedName}.`);
      } else {
        setError(msg || `Failed to connect to ${expectedName}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    cachedConnectedApi = null;
    setWalletAddress(null);
    setWalletName(null);
    setError(null);
  }, []);

  const getConnectedApi = useCallback(() => {
    return cachedConnectedApi;
  }, []);

  return {
    walletAddress,
    walletName,
    isConnecting,
    isConnected: !!walletAddress && !!cachedConnectedApi,
    error,
    connect,
    disconnect,
    getConnectedApi,
  };
};
