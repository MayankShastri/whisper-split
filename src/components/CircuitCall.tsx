import React, { useRef, useState } from 'react';
import { DeployPanel } from './DeployPanel';
import { useMidnight } from '../hooks/useMidnight';
import { useDebtContractState } from '../hooks/useDebtContractState';
import { callSettleDebtCircuit, type DebtPrivateState } from '../debtProviders';
import { describeTxError } from '../txError';

export const CircuitCall: React.FC<{ onBackToLanding: () => void }> = ({ onBackToLanding }) => {
  const { getConnectedApi, isConnected } = useMidnight();
  const privateState = useRef<DebtPrivateState | null>(null);
  const busy = useRef(false);
  const [contractAddress, setContractAddress] = useState('');
  const [pending, setPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { state, error, loading, refetch } = useDebtContractState(contractAddress);

  const settle = async () => {
    const api = getConnectedApi();
    if (!api || !privateState.current || busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage(null);
    try {
      const result = await callSettleDebtCircuit(api, contractAddress, privateState.current);
      if (getConnectedApi() !== api) return;
      setTxHash(result.txHash);
      setMessage('Settlement call returned. Refresh the indexer to inspect public settlement state.');
      await refetch();
    } catch (e) {
      console.error('settle failed:', e);
      setMessage(describeTxError(e, 'Settlement did not complete. Check wallet activity and refresh the indexer before retrying.'));
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return <div className="w-full max-w-3xl mx-auto space-y-6">
    <h1 className="text-3xl font-serif">Private Debt Settlement</h1>
    <DeployPanel onDeploySuccess={(address, hash, secret) => {
      privateState.current = secret;
      setContractAddress(address);
      setTxHash(hash);
      setMessage('Deployment submitted. Indexer confirmation is pending. Keep this session open to retain private inputs.');
    }} />
    <section className="p-8 border border-[#F5F1E8]/15 bg-[#0C0C0E] space-y-4">
      <h2 className="text-xl font-serif">Debt status</h2>
      <label className="block text-xs" htmlFor="debt-address">Public debt contract address (64 hex characters)</label>
      <input id="debt-address" value={contractAddress} disabled={pending} onChange={event => {
        privateState.current = null;
        setTxHash(null);
        setMessage(null);
        setContractAddress(event.target.value.trim().replace(/^0x/, ''));
      }} className="w-full bg-[#0A0A0B] border border-[#F5F1E8]/20 px-4 py-3 font-mono text-xs" />
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt>Indexed status</dt><dd>{loading ? 'Loading…' : state ? state.settled ? 'Settled' : 'Unsettled' : 'Unknown'}</dd></div>
        <div className="flex justify-between"><dt>Settlement counter</dt><dd>{state?.settlementCount.toString() ?? 'Unknown'}</dd></div>
        <div className="flex justify-between"><dt>Private inputs</dt><dd>Never displayed</dd></div>
      </dl>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      {txHash && <p className="text-xs break-all">Returned transaction identifier: <a className="text-accent underline" target="_blank" rel="noreferrer" href={`https://preprod.midnightexplorer.com/transactions/${txHash}`}>{txHash}</a></p>}
      <div className="flex flex-wrap gap-4">
        <button onClick={settle} disabled={!isConnected || !privateState.current || !state || state.settled || pending} className="bg-accent px-6 py-3 text-xs uppercase disabled:opacity-40">{pending ? 'Processing settlement…' : 'Prove equality and settle'}</button>
        <button onClick={() => void refetch()} disabled={loading || pending} className="border border-accent px-6 py-3 text-xs">Refresh indexer</button>
        <button onClick={onBackToLanding} className="px-6 py-3 text-xs">Back</button>
      </div>
      <p className="text-xs text-[#F5F1E8]/70">Existing addresses can be inspected. Settlement requires the private state generated when deploying in this screen. Leaving this screen or disconnecting clears it.</p>
    </section>
  </div>;
};
