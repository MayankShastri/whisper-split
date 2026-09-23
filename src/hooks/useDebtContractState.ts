import { useState, useEffect, useCallback, useRef } from 'react';
import { createPatchedPublicDataProvider } from '../midnightProviders';
import { debtLedger } from '../debtProviders';
import { useMidnight } from './useMidnight';

export function useDebtContractState(contractAddress: string) {
  const { getConnectedApi, walletAddress } = useMidnight();
  const [state, setState] = useState<{ settled: boolean; settlementCount: bigint } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const refetch = useCallback(async () => {
    const request = ++version.current;
    setState(null);
    setError(null);
    const api = getConnectedApi();
    if (!api || !/^[0-9a-f]{64}$/i.test(contractAddress)) { setLoading(false); return; }
    setLoading(true);
    try {
      const config = await api.getConfiguration();
      const provider = createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri);
      const raw = await provider.queryContractState(contractAddress);
      if (!raw) throw new Error('Not indexed');
      const parsed = debtLedger(raw.data);
      if (version.current === request) setState({ settled: parsed.settled, settlementCount: parsed.settlementCount });
    } catch {
      if (version.current === request) setError('Debt state unavailable. Check the contract address, wallet network and indexer, then refresh.');
    } finally {
      if (version.current === request) setLoading(false);
    }
  }, [contractAddress, getConnectedApi, walletAddress]);
  useEffect(() => { void refetch(); return () => { version.current += 1; }; }, [refetch]);
  return { state, loading, error, refetch };
}
