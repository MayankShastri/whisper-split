import React, { useState, useEffect } from 'react';
import { DeployPanel } from '../components/DeployPanel';
import { useMidnight } from '../hooks/useMidnight';
import { useContractState } from '../hooks/useContractState';
import { callSettleDebtCircuit } from '../midnightProviders';

type SettlementFlowProps = {
  onBackToLanding: () => void;
};

export const SettlementFlow: React.FC<SettlementFlowProps> = ({
  onBackToLanding,
}) => {
  const { walletAddress, getConnectedApi } = useMidnight();
  const [contractAddress, setContractAddress] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whisper_split_deployed_info');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.address) return parsed.address;
        } catch {}
      }
    }
    return '2e5b7029de6660d78610ba39b67dc0e467c811dc6bf84acf996679b491a85def';
  });
  
  const { settled, settlementCount, lastTxHash, loading: stateLoading, refetch, markSettled } = useContractState(contractAddress);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [paidAmount, setPaidAmount] = useState<string>('100');
  const [provingStatusIndex, setProvingStatusIndex] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settleTxHash, setSettleTxHash] = useState<string | null>(null);

  const provingMessages = [
    '1. Initialising Compact circuit & loading verifier key...',
    '2. Invoking getOwedAmount() private witness from local state...',
    '3. Generating zero-knowledge proof in browser...',
    '4. Prompting wallet extension to approve & broadcast...',
    '5. Transaction submitted! Awaiting ledger finalization...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 3) {
      interval = setInterval(() => {
        setProvingStatusIndex((prev) => (prev < provingMessages.length - 1 ? prev + 1 : prev));
      }, 1400);

      const runSettlement = async () => {
        try {
          const numericAmount = BigInt(paidAmount || '0');
          if (numericAmount <= 0n) {
            throw new Error('Payment amount must be greater than zero.');
          }

          const connectedApi = getConnectedApi();
          if (!connectedApi) {
            throw new Error('Wallet not connected. Please connect your wallet first.');
          }

          console.log(`Executing real Compact circuit call 'settleDebt(${numericAmount})' on contract ${contractAddress}...`);
          
          const result = await callSettleDebtCircuit(
            connectedApi,
            contractAddress,
            numericAmount,
            100n // Expected debt owed amount
          );

          const finalTxHash = result.txHash;
          console.log('settleDebt circuit invocation completed. Tx Hash:', finalTxHash);
          
          setSettleTxHash(finalTxHash);
          markSettled(finalTxHash);

          await new Promise(resolve => setTimeout(resolve, 2000));
          await refetch();
          setIsSuccess(true);
        } catch (err: any) {
          console.error('Circuit execution error:', err);
          setIsSuccess(false);
          
          let errorMsg = err?.message || 'Settlement circuit execution failed';
          if (errorMsg.includes('User rejected') || errorMsg.includes('declined')) {
            errorMsg = 'Transaction was declined in wallet. Please try again and approve the transaction.';
          } else if (errorMsg.includes('Paid amount does not match')) {
            errorMsg = 'Verification failed: The paid amount does not match the private owed amount witness.';
          } else if (errorMsg.includes('already settled')) {
            errorMsg = 'Contract state error: This debt has already been settled on-chain.';
          }
          
          setErrorMessage(errorMsg);
        } finally {
          setStep(4);
        }
      };

      runSettlement();
    }
    return () => clearInterval(interval);
  }, [step]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ON-CHAIN DEPLOY PANEL */}
      {step === 1 && (
        <DeployPanel
          onDeploySuccess={(addr, hash) => {
            console.log('Contract confirmed on chain:', addr, hash);
            setContractAddress(addr);
          }}
        />
      )}

      {/* STEP 1: DASHBOARD */}
      {step === 1 && (
        <div className="p-8 md:p-12 bg-[#0C0C0E] border border-[#F5F1E8]/15 relative overflow-hidden transition-opacity duration-300">
          <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-[#F5F1E8]/30"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-[#F5F1E8]/30"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-[#F5F1E8]/30"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-[#F5F1E8]/30"></div>

          <div className="text-xs text-accent uppercase tracking-[0.2em] mb-6 font-mono">
            // 01 — DEBT STATUS OVERVIEW
          </div>

          <h2 className="text-3xl font-light font-serif text-[#F5F1E8] mb-8">
            Active Settlement Node
          </h2>

          <div className="space-y-4 border-t border-[#F5F1E8]/10 pt-6 mb-8 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#F5F1E8]/5 gap-1">
              <span className="text-[#F5F1E8]/50 uppercase">Contract Address</span>
              <span className="text-accent text-[10px] font-mono tracking-wider break-all font-semibold">
                {contractAddress}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#F5F1E8]/5">
              <span className="text-[#F5F1E8]/50 uppercase">Network</span>
              <span className="text-[#7DF9FF]">Midnight Preprod</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#F5F1E8]/5">
              <span className="text-[#F5F1E8]/50 uppercase">Ledger State (On-Chain)</span>
              {stateLoading ? (
                <span className="text-[#F5F1E8]/40 animate-pulse">QUERYING INDEXER...</span>
              ) : (
                <span className={settled ? 'text-[#7DF9FF]' : 'text-[#FF4444]'}>
                  {settled ? '● SETTLED' : '○ UNSETTLED'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#F5F1E8]/5">
              <span className="text-[#F5F1E8]/50 uppercase">Settlement Counter</span>
              <span className="text-[#F5F1E8]">{settlementCount.toString()}</span>
            </div>

            {lastTxHash && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#F5F1E8]/5 gap-1">
                <span className="text-[#F5F1E8]/50 uppercase">Latest Confirmed Tx</span>
                <a
                  href={`https://preprod.midnightexplorer.com/transactions/${lastTxHash.startsWith('0x') ? lastTxHash : `0x${lastTxHash}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7DF9FF] text-[10px] font-mono tracking-wider break-all hover:underline"
                >
                  {lastTxHash}
                </a>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-b border-[#F5F1E8]/5">
              <span className="text-[#F5F1E8]/50 uppercase">Owed Balance</span>
              <span className="text-accent bg-[#2596be]/10 px-2 py-0.5 border border-[#2596be]/20 text-[10px]">
                SHIELDED BY WITNESS
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setStep(2)}
              disabled={settled}
              className={`flex-1 inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 transition-all duration-300 ${
                settled
                  ? 'opacity-40 cursor-not-allowed bg-[#F5F1E8]/20 text-[#F5F1E8]/40'
                  : 'hover:bg-accent/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] cursor-pointer'
              }`}
            >
              {settled ? 'Debt Already Settled' : 'Begin Settlement →'}
            </button>

            {settled && (
              <button
                onClick={() => refetch()}
                className="border border-[#7DF9FF]/40 text-[#7DF9FF] hover:bg-[#7DF9FF]/10 px-4 py-4 text-xs font-mono tracking-widest uppercase transition-colors cursor-pointer"
                title="Re-query live state from Midnight indexer"
              >
                [Dev/Demo: Sync Indexer]
              </button>
            )}

            <button
              onClick={onBackToLanding}
              className="border border-[#F5F1E8]/20 px-6 py-4 text-xs font-mono tracking-widest uppercase hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: VALIDATION */}
      {step === 2 && (
        <div className="p-8 md:p-12 bg-[#0C0C0E] border border-[#F5F1E8]/15 relative overflow-hidden transition-opacity duration-300">
          <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-[#F5F1E8]/30"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-[#F5F1E8]/30"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-[#F5F1E8]/30"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-[#F5F1E8]/30"></div>

          <div className="text-xs text-accent uppercase tracking-[0.2em] mb-6 font-mono">
            // 02 — PRIVATE WITNESS INPUT
          </div>

          <h2 className="text-3xl font-light font-serif text-[#F5F1E8] mb-4">
            Specify Payment Amount
          </h2>
          <p className="text-xs text-[#F5F1E8]/60 mb-8 leading-relaxed">
            Enter the amount you wish to settle. The Zero-Knowledge circuit will evaluate whether
            this matches the confidential amount owed, without revealing either number on-chain.
          </p>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-[10px] text-[#F5F1E8]/50 uppercase tracking-widest mb-2 font-mono">
                Amount to settle (tNIGHT tokens equivalent)
              </label>
              <input
                id="paidAmount"
                name="paidAmount"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#F5F1E8]/20 px-4 py-3 text-lg font-mono text-[#F5F1E8] focus:border-accent focus:outline-none transition-colors"
                placeholder="100"
              />
            </div>

            <div className="p-4 bg-[#0A0A0B] border border-accent/20 text-xs text-[#7DF9FF]/80 space-y-1">
              <div className="text-[10px] uppercase text-accent font-semibold tracking-wider">
                🛡️ Witness Protection Guarantee:
              </div>
              <div>
                This number stays exclusively inside your local proving environment. The public ledger
                will only record a boolean equality assertion.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                setProvingStatusIndex(0);
                setStep(3);
              }}
              disabled={!paidAmount || Number(paidAmount) <= 0}
              className="flex-1 inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 transition-all duration-300 hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] cursor-pointer"
            >
              Generate ZK Proof →
            </button>
            <button
              onClick={() => setStep(1)}
              className="border border-[#F5F1E8]/20 px-6 py-4 text-xs font-mono tracking-widest uppercase hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROVING */}
      {step === 3 && (
        <div className="p-8 md:p-12 bg-[#0C0C0E] border border-accent/30 relative overflow-hidden text-center transition-opacity duration-300">
          <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-accent"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-accent"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-accent"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-accent"></div>

          <div className="text-xs text-accent uppercase tracking-[0.2em] mb-8 font-mono">
            // 03 — ZERO-KNOWLEDGE PROOF GENERATION
          </div>

          <div className="w-16 h-16 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-8"></div>

          <h3 className="text-2xl font-serif text-[#F5F1E8] font-light mb-3">
            Constructing Shielded Proof
          </h3>

          <div className="text-xs font-mono text-accent tracking-widest uppercase mb-4 h-6">
            {provingMessages[provingStatusIndex]}
          </div>

          <p className="text-[11px] text-[#F5F1E8]/40 max-w-sm mx-auto leading-relaxed font-mono">
            Compiling execution traces against the verifier key. Your witness inputs remain private.
          </p>
        </div>
      )}

      {/* STEP 4: RESULT */}
      {step === 4 && (
        <div className="p-8 md:p-12 bg-[#0C0C0E] border border-[#F5F1E8]/15 relative overflow-hidden text-center transition-opacity duration-300">
          <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-[#F5F1E8]/30"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-[#F5F1E8]/30"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-[#F5F1E8]/30"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-[#F5F1E8]/30"></div>

          {isSuccess ? (
            <div>
              <div className="w-16 h-16 bg-[#7DF9FF]/10 border border-[#7DF9FF]/30 text-[#7DF9FF] flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>

              <div className="text-xs text-[#7DF9FF] uppercase tracking-[0.2em] mb-2 font-mono">
                // SETTLEMENT ON-CHAIN SUBMITTED
              </div>

              <h2 className="text-3xl md:text-4xl font-light font-serif text-[#F5F1E8] mb-4">
                Debt Transaction Sent
              </h2>

              <p className="text-xs text-[#F5F1E8]/60 mb-6 max-w-md mx-auto leading-relaxed font-mono">
                The transaction was signed and submitted to the Midnight network.
              </p>

              {settleTxHash && (
                <div className="mb-8 p-4 bg-[#0A0A0B] border border-[#F5F1E8]/10 text-left text-[11px] font-mono space-y-2 max-w-lg mx-auto">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-[#F5F1E8]/40 uppercase">Contract:</span>
                    <span className="text-accent break-all">{contractAddress}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <span className="text-[#F5F1E8]/40 uppercase">Tx Hash:</span>
                    <a
                      href={`https://preprod.midnightexplorer.com/transactions/${settleTxHash.startsWith('0x') ? settleTxHash : `0x${settleTxHash}`}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7DF9FF] break-all hover:underline"
                    >
                      {settleTxHash}
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#F5F1E8]/40 uppercase">Network Status:</span>
                    <span className="text-[#7DF9FF]">SUBMITTED TO PREPROD</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 transition-all duration-300 hover:bg-accent/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 bg-[#FF4444]/10 border border-[#FF4444]/30 text-[#FF4444] flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>

              <div className="text-xs text-[#FF4444] uppercase tracking-[0.2em] mb-2 font-mono">
                // TRANSACTION REJECTED
              </div>

              <h2 className="text-3xl md:text-4xl font-light font-serif text-[#F5F1E8] mb-4">
                Settlement Failed
              </h2>

              <p className="text-xs text-[#FF4444]/80 mb-8 max-w-md mx-auto leading-relaxed font-mono">
                {errorMessage || 'Transaction was declined or rejected.'}
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 transition-all duration-300 hover:bg-accent/90 cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="border border-[#F5F1E8]/20 px-6 py-4 text-xs font-mono tracking-widest uppercase hover:border-accent hover:text-accent transition-colors cursor-pointer"
                >
                  Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

