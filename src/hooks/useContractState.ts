import { useState, useCallback, useEffect, useRef } from 'react';
import { createPatchedPublicDataProvider, fromHex, ledger, toHex } from '../midnightProviders';
import { useMidnight } from './useMidnight';
import { computeClaimKey } from '../merkle';

export type SplitContractState = {
  sharesRoot: bigint;
  sharesRootHex: string;
  depositAmount: bigint;
  distributionCount: bigint;
  poolExists: boolean;
  claimedMap: Map<string, boolean>;
};

// Reads the selected pool's entries from the multi-pool ledger Maps; the contract itself may host many pools.
export const useContractState = (contractAddress: string | null, poolIdHex?: string) => {
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
      const poolId = poolIdHex && /^[0-9a-f]{64}$/i.test(poolIdHex) ? fromHex(poolIdHex) : null;
      const poolExists = !!poolId && parsed.poolSharesRoot.member(poolId);
      const sharesRoot = poolExists ? parsed.poolSharesRoot.lookup(poolId) : 0n;
      if (request === requestId.current) setState({
        sharesRoot,
        sharesRootHex: poolExists ? '0x' + sharesRoot.toString(16) : '',
        depositAmount: poolExists ? parsed.poolDepositAmount.lookup(poolId) : 0n,
        distributionCount: poolExists ? parsed.poolDistributionCount.lookup(poolId) : 0n,
        poolExists,
        claimedMap,
      });
    } catch (e) {
      console.error('useContractState refetch failed:', e);
      if (request === requestId.current) setError('Payroll state unavailable. Check the address and wallet indexer, then refresh.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [contractAddress, poolIdHex, walletAddress, getConnectedApi]);
  useEffect(() => { void refetch(); return () => { requestId.current += 1; }; }, [refetch]);
  const isClaimed = useCallback((id: string | Uint8Array) => {
    try {
      const bytes = typeof id === 'string' ? fromHex(id.trim()) : id;
      return state?.claimedMap.get(toHex(computeClaimKey(fromHex(poolIdHex ?? ''), bytes))) === true;
    } catch {
      return false; // malformed participant or pool id
    }
  }, [state, poolIdHex]);
  const refreshAfterSubmission = useCallback(() => { void refetch(); }, [refetch]);
  return {
    sharesRoot: state?.sharesRoot ?? 0n,
    sharesRootHex: state?.sharesRootHex ?? '',
    depositAmount: state?.depositAmount ?? 0n,
    distributionCount: state?.distributionCount ?? 0n,
    poolExists: state?.poolExists ?? false,
    lastTxHash: null as string | null,
    loading, isLoading: loading, error,
    refetch, refreshState: refetch,
    isClaimed, checkIfClaimed: isClaimed,
    contractState: state,
    markDeposited: (_txHash: string, _root: bigint, _amount: bigint) => refreshAfterSubmission(),
    markClaimed: (_txHash: string, _participantId: string) => refreshAfterSubmission(),
  };
};
