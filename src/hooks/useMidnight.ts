import { createContext, createElement, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export type WalletBalances = {
  unshieldedNight: string | null;
  shieldedNight: string | null;
  dustBalance: string | null;
};

export type MidnightState = {
  walletAddress: string | null;
  walletName: string | null;
  selectedWalletKey: '1am' | 'mnLace' | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  networkId: string | null;
  balances: WalletBalances;
  connect: (preferredWallet: '1am' | 'mnLace') => Promise<void>;
  disconnect: () => void;
  getConnectedApi: () => ConnectedAPI | null;
  refreshBalances: () => Promise<void>;
};

const emptyBalances: WalletBalances = { unshieldedNight: null, shieldedNight: null, dustBalance: null };
const MidnightContext = createContext<MidnightState | null>(null);

export function MidnightProvider({ children }: { children: ReactNode }) {
  const apiRef = useRef<ConnectedAPI | null>(null);
  const generation = useRef(0);
  const connecting = useRef(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [selectedWalletKey, setSelectedWalletKey] = useState<'1am' | 'mnLace' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [balances, setBalances] = useState<WalletBalances>(emptyBalances);

  const disconnect = useCallback(() => {
    generation.current += 1;
    apiRef.current = null;
    connecting.current = false;
    setIsConnecting(false);
    setWalletAddress(null);
    setWalletName(null);
    setSelectedWalletKey(null);
    setNetworkId(null);
    setBalances(emptyBalances);
    setError(null);
  }, []);

  const refreshBalances = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const request = generation.current;
    try {
      const dust = await api.getDustBalance();
      if (request === generation.current && apiRef.current === api) {
        setBalances({ ...emptyBalances, dustBalance: dust.balance.toString() });
      }
    } catch {
      if (request === generation.current) setBalances(emptyBalances);
    }
  }, []);

  const connect = useCallback(async (key: '1am' | 'mnLace') => {
    if (connecting.current) return;
    disconnect();
    const request = generation.current;
    connecting.current = true;
    setIsConnecting(true);
    try {
      const name = key === '1am' ? '1am' : 'lace';
      const wallets = Object.values(window.midnight ?? {}) as InitialAPI[];
      const wallet = wallets.find(w => w && typeof w.connect === 'function' &&
        `${w.name} ${w.rdns}`.toLowerCase().includes(name));
      if (!wallet) throw new Error('Wallet not found');
      if (!/^4\./.test(wallet.apiVersion)) throw new Error('Unsupported connector');
      const api = await wallet.connect('preprod');
      const [address, config, status] = await Promise.all([
        api.getUnshieldedAddress(), api.getConfiguration(), api.getConnectionStatus(),
      ]);
      if (request !== generation.current) return;
      if (status.status !== 'connected' || config.networkId !== 'preprod' || !address.unshieldedAddress) {
        throw new Error('Network mismatch or disconnected');
      }
      apiRef.current = api;
      setWalletAddress(address.unshieldedAddress);
      setWalletName(wallet.name);
      setSelectedWalletKey(key);
      setNetworkId(config.networkId);
      void refreshBalances();
    } catch {
      if (request === generation.current) {
        apiRef.current = null;
        setError('Connection failed. Install or unlock your wallet, select Preprod, and approve the request. Connector API v4 is required.');
      }
    } finally {
      if (request === generation.current) {
        connecting.current = false;
        setIsConnecting(false);
      }
    }
  }, [disconnect, refreshBalances]);

  useEffect(() => {
    if (!walletAddress) return;
    const id = window.setInterval(async () => {
      const api = apiRef.current;
      const request = generation.current;
      if (!api) return;
      try {
        const status = await api.getConnectionStatus();
        if (request === generation.current && (status.status !== 'connected' || status.networkId !== 'preprod')) disconnect();
      } catch {
        if (request === generation.current) disconnect();
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [walletAddress, disconnect]);

  useEffect(() => () => { generation.current += 1; apiRef.current = null; }, []);
  const getConnectedApi = useCallback(() => apiRef.current, []);
  return createElement(MidnightContext.Provider, { value: {
    walletAddress, walletName, selectedWalletKey, isConnecting, isConnected: !!walletAddress,
    error, networkId, balances, connect, disconnect, getConnectedApi, refreshBalances,
  } }, children);
}

export function useMidnight(): MidnightState {
  const context = useContext(MidnightContext);
  if (!context) throw new Error('useMidnight requires MidnightProvider');
  return context;
}
