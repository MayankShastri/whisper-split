import React, { useRef, useState } from 'react';
import { useMidnight } from '../hooks/useMidnight';
import { deployDebtContractOnChain, generateDebtPrivateState, type DebtPrivateState } from '../debtProviders';

export const DeployPanel: React.FC<{
  onDeploySuccess: (contractAddress: string, txHash: string, state: DebtPrivateState) => void;
}> = ({ onDeploySuccess }) => {
  const { isConnected, getConnectedApi } = useMidnight();
  const busy = useRef(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleDeploy = async () => {
    const api = getConnectedApi();
    if (!api || busy.current) return;
    busy.current = true;
    setIsDeploying(true);
    setError(null);
    try {
      const state = generateDebtPrivateState();
      const result = await deployDebtContractOnChain(api, state);
      if (getConnectedApi() === api) onDeploySuccess(result.contractAddress, result.txHash, state);
    } catch {
      setError('Deployment did not complete. Check wallet activity before retrying; submission may already have occurred.');
    } finally {
      busy.current = false;
      setIsDeploying(false);
    }
  };
  return <section className="p-8 bg-[#0C0C0E] border border-[#F5F1E8]/15 space-y-4 font-mono">
    <h2 className="text-2xl font-serif">Deploy Debt Contract</h2>
    <p className="text-xs text-[#F5F1E8]/70">Restored Level 1 equality-proof demonstration on Preprod. Private amounts are generated in this browser session and never displayed. This contract marks settlement; it does not transfer tokens or authenticate a creditor-approved debt.</p>
    <p className="text-xs text-[#F5F1E8]/70">Proving uses your wallet or its configured proof server. Only use a prover you trust with private inputs.</p>
    <button disabled={!isConnected || isDeploying} onClick={handleDeploy} className="bg-accent px-6 py-3 text-xs uppercase disabled:opacity-40">
      {isDeploying ? 'Preparing and submitting deployment…' : 'Deploy new debt contract'}
    </button>
    {!isConnected && <p className="text-xs">Connect Lace or 1AM using the shared wallet control first.</p>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </section>;
};
