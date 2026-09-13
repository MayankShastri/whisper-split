import { useState, useEffect, useCallback } from 'react';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ledger } from '../../managed/debt/contract/index.js';

const INDEXER_GRAPHQL_URL = 'https://indexer.preprod.midnight.network/api/v4/graphql';

const CONTRACT_STATE_QUERY = `
  query GetContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      state
      transaction {
        hash
        block {
          height
        }
      }
    }
  }
`;

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

export interface LiveContractState {
  settled: boolean;
  settlementCount: bigint;
  lastTxHash: string | null;
  blockHeight: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markSettled: (txHash: string) => void;
}

export function useContractState(contractAddress: string): LiveContractState {
  const [settled, setSettled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whisper_split_onchain_settled') === 'true';
    }
    return false;
  });

  const [settlementCount, setSettlementCount] = useState<bigint>(() => {
    if (typeof window !== 'undefined') {
      const cnt = localStorage.getItem('whisper_split_onchain_count');
      return cnt ? BigInt(cnt) : 0n;
    }
    return 0n;
  });

  const [lastTxHash, setLastTxHash] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whisper_split_last_tx') || null;
    }
    return null;
  });

  const [blockHeight, setBlockHeight] = useState<number | null>(2536207);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const markSettled = useCallback((txHash: string) => {
    setSettled(true);
    setSettlementCount(prev => {
      const next = prev > 0n ? prev + 1n : 1n;
      if (typeof window !== 'undefined') {
        localStorage.setItem('whisper_split_onchain_count', next.toString());
      }
      return next;
    });
    setLastTxHash(txHash);
    if (typeof window !== 'undefined') {
      localStorage.setItem('whisper_split_onchain_settled', 'true');
      localStorage.setItem('whisper_split_last_tx', txHash);
    }
  }, []);

  const fetchLiveState = useCallback(async () => {
    const cleanAddress = contractAddress.trim();
    if (!cleanAddress || cleanAddress.length < 64) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(INDEXER_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: CONTRACT_STATE_QUERY,
          variables: { address: cleanAddress },
        }),
      });

      const json = await res.json();
      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0]?.message || 'Indexer query failed');
      }

      const action = json.data?.contractAction;
      if (action && action.state) {
        const stateHex = action.state;
        const stateBytes = hexToBytes(stateHex);
        const contractState = ContractState.deserialize(stateBytes);
        const ledgerState = ledger(contractState.data);
        
        setSettled(Boolean(ledgerState.settled));
        setSettlementCount(BigInt(ledgerState.settlementCount ?? 0n));
        setLastTxHash(action.transaction?.hash || null);
        setBlockHeight(action.transaction?.block?.height || null);
        setError(null);
      }
    } catch (err: any) {
      console.warn('Live indexer fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [contractAddress]);

  useEffect(() => {
    fetchLiveState();
    const interval = setInterval(fetchLiveState, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveState]);

  return {
    settled,
    settlementCount,
    lastTxHash,
    blockHeight,
    loading,
    error,
    refetch: fetchLiveState,
    markSettled,
  };
}
