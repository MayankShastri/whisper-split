import React, { useState } from 'react';
import { useMidnight } from '../hooks/useMidnight';
import { deployDebtContractOnChain } from '../midnightProviders';

export const DeployPanel: React.FC<{
  onDeploySuccess: (contractAddress: string, txHash: string) => void;
}> = ({ onDeploySuccess }) => {
  const { isConnected, walletName, connect, getConnectedApi } = useMidnight();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<string | null>(null);
  
  // Read dynamically from localStorage if deployed previously
  const [deployedInfo, setDeployedInfo] = useState<{ address: string; txHash: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whisper_split_deployed_info');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return null;
  });

  const [error, setError] = useState<string | null>(null);

  const getConnectedWalletAPI = async () => {
    const cached = getConnectedApi();
    if (cached) return cached;

    if (typeof window === 'undefined') throw new Error('No browser window found');
    const midnight = (window as any).midnight;
    if (!midnight) throw new Error('No Midnight wallet extension found');

    const wallet = midnight['1am'] || midnight.mnLace || Object.values(midnight).find(
      (w: any) => !!w && typeof w === 'object' && typeof w.connect === 'function'
    );

    if (!wallet) throw new Error('Wallet extension not found');
    return await wallet.connect('preprod');
  };

  const handleDeploy = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setError(null);
    setDeployStep('1. Connecting to active wallet and preparing providers...');

    try {
      const connectedApi = await getConnectedWalletAPI();

      setDeployStep('2. Compiling Compact contract artifacts & prover keys...');
      setDeployStep('3. Constructing deploy transaction and generating proof...');
      
      const result = await deployDebtContractOnChain(connectedApi, 100n);
      const contractAddress = result.contractAddress;
      const capturedTxHash = result.txHash;

      setDeployStep('4. Contract successfully broadcast & confirmed on Midnight Preprod!');
      const newInfo = { address: contractAddress, txHash: capturedTxHash };
      setDeployedInfo(newInfo);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('whisper_split_deployed_info', JSON.stringify(newInfo));
      }

      onDeploySuccess(contractAddress, capturedTxHash);
    } catch (err: any) {
      console.error('Deployment error:', err);
      const msg = err?.message || String(err);
      if (msg.includes('User rejected') || msg.includes('Rejected')) {
        setError('Transaction was cancelled in the wallet.');
      } else if (msg.includes('Duplicate request') || msg.includes('already pending')) {
        setError('A request is already open in your wallet window. Please check the 1AM/Lace extension popup.');
      } else {
        setError(msg || 'Deployment transaction failed.');
      }
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="p-8 bg-[#0C0C0E] border border-[#F5F1E8]/15 relative overflow-hidden mb-8 font-mono">
      <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-[#F5F1E8]/30"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-[#F5F1E8]/30"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-[#F5F1E8]/30"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-[#F5F1E8]/30"></div>

      <div className="text-xs text-accent uppercase tracking-[0.2em] mb-4">
        // ON-CHAIN GENESIS DEPLOYMENT
      </div>

      <h3 className="text-2xl font-light font-serif text-[#F5F1E8] mb-3">
        Deploy Debt Contract to Preprod
      </h3>

      <p className="text-xs text-[#F5F1E8]/60 mb-6 leading-relaxed">
        Broadcasts the compiled <code className="text-accent">debt.compact</code> contract to Midnight Preprod.
        Requires a connected wallet ({walletName || '1AM / Lace'}) with active tDUST.
      </p>

      {deployedInfo ? (
        <div className="p-4 bg-[#0A0A0B] border border-[#7DF9FF]/30 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#7DF9FF] uppercase tracking-wider font-semibold">
              ✓ CONTRACT BROADCAST & CONFIRMED
            </span>
            <button
              onClick={() => {
                setDeployedInfo(null);
                if (typeof window !== 'undefined') localStorage.removeItem('whisper_split_deployed_info');
              }}
              className="text-[10px] text-[#F5F1E8]/40 hover:text-accent underline cursor-pointer"
            >
              Re-deploy
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 pt-2 border-t border-[#F5F1E8]/10">
            <span className="text-[#F5F1E8]/50">Contract Address:</span>
            <span className="text-accent break-all">{deployedInfo.address}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
            <span className="text-[#F5F1E8]/50">Deployment Tx Hash:</span>
            <a
              href={`https://preprod.midnightexplorer.com/transactions/${deployedInfo.txHash.startsWith('0x') ? deployedInfo.txHash : `0x${deployedInfo.txHash}`}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7DF9FF] break-all hover:underline"
            >
              {deployedInfo.txHash}
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {deployStep && (
            <div className="text-xs font-mono text-accent animate-pulse">
              {deployStep}
            </div>
          )}
          {error && (
            <div className="text-xs font-mono text-[#FF4444]">
              {error}
            </div>
          )}

          <button
            onClick={isConnected ? handleDeploy : () => connect('1am')}
            disabled={isDeploying}
            className="inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 transition-all duration-300 hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
          >
            {isDeploying
              ? 'Broadcasting to Preprod...'
              : isConnected
              ? 'Broadcast Contract Deploy Transaction →'
              : 'Connect Wallet (1AM / Lace) First'}
          </button>
        </div>
      )}
    </div>
  );
};
