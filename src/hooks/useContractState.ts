import { useState, useCallback, useEffect, useRef } from 'react';
import { createPatchedPublicDataProvider, ledger, toHex } from '../midnightProviders';
import { useMidnight } from './useMidnight';

export type SplitContractState = {
  sharesRoot: bigint;
  sharesRootHex: string;
  depositAmount: bigint;
  distributionCount: bigint;
  claimedMap: Map<string, boolean>;
};

export const useContractState = (contractAddress: string | null) => {
  const { getConnectedApi, walletAddress } = useMidnight();
  const [state, setState] = useState<SplitContractState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const refetch = useCallback(async () => {
    const request = ++requestId.current;
    setState(null);
    setError(null);
    const api = getConnectedApi();
    if (!api || !contractAddress || !/^[0-9a-f]{64}$/i.test(contractAddress)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = await api.getConfiguration();
      const provider = createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri);
      const raw = await provider.queryContractState(contractAddress);
      if (!raw) throw new Error('Not indexed');
      const parsed = ledger(raw.data);
      const claimedMap = new Map<string, boolean>();
      for (const [key, value] of parsed.claimed) claimedMap.set(toHex(key), value);
      if (request === requestId.current) setState({
        sharesRoot: parsed.sharesRoot,
        sharesRootHex: '0x' + parsed.sharesRoot.toString(16),
        depositAmount: parsed.depositAmount,
        distributionCount: parsed.distributionCount,
        claimedMap,
      });
    } catch (e) {
      console.error('useContractState refetch failed:', e);
      if (request === requestId.current) setError('Payroll state unavailable. Check the address and wallet indexer, then refresh.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [contractAddress, walletAddress, getConnectedApi]);
  useEffect(() => { void refetch(); return () => { requestId.current += 1; }; }, [refetch]);
  const isClaimed = useCallback((id: string | Uint8Array) => {
    const hex = typeof id === 'string' ? id.replace(/^0x/, '').toLowerCase() : toHex(id);
    return state?.claimedMap.get(hex) === true;
  }, [state]);
  const refreshAfterSubmission = useCallback(() => { void refetch(); }, [refetch]);
  return {
    sharesRoot: state?.sharesRoot ?? 0n,
    sharesRootHex: state?.sharesRootHex ?? '',
    depositAmount: state?.depositAmount ?? 0n,
    distributionCount: state?.distributionCount ?? 0n,
    lastTxHash: null as string | null,
    loading, isLoading: loading, error,
    refetch, refreshState: refetch,
    isClaimed, checkIfClaimed: isClaimed,
    contractState: state,
    markDeposited: (_txHash: string, _root: bigint, _amount: bigint) => refreshAfterSubmission(),
    markClaimed: (_txHash: string, _participantId: string) => refreshAfterSubmission(),
  };
};
