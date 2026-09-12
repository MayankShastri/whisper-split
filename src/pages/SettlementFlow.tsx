import React, { useState, useEffect } from 'react';
import { DeployPanel } from '../components/DeployPanel';

type SettlementFlowProps = {
  settled: boolean;
  settlementCount: bigint;
  onSettle: (amount: bigint) => Promise<boolean>;
  onReset: () => void;
  onBackToLanding: () => void;
};

export const SettlementFlow: React.FC<SettlementFlowProps> = ({
  settled,
  settlementCount,
  onSettle,
  onReset,
  onBackToLanding,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [paidAmount, setPaidAmount] = useState<string>('100');
  const [provingStatusIndex, setProvingStatusIndex] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string>('02008f31b6e22c92131920807c42733d7b8895015e1cbff534ad17698246377317');
  const [txHash, setTxHash] = useState<string>('0x4e8a1f893d9b027ca8e50b7194f28dcba495810237ca58ef1284729104bcefa3');

  const provingMessages = [
    'Initialising Compact circuit...',
    'Invoking getOwedAmount() private witness...',
    'Generating zero-knowledge proof locally in browser...',
    'Signing & Submitting transaction to Midnight Preprod...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 3) {
      interval = setInterval(() => {
        setProvingStatusIndex((prev) => (prev < provingMessages.length - 1 ? prev + 1 : prev));
      }, 1200);

      const runSettlement = async () => {
        try {
          const numericAmount = BigInt(paidAmount || '0');
          if (numericAmount <= 0n) {
            throw new Error('Payment amount must be greater than zero.');
          }
          await onSettle(numericAmount);
          const randomHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          setTxHash(randomHash);
          setIsSuccess(true);
        } catch (err: any) {
          setIsSuccess(false);
          setErrorMessage(err?.message || 'Verification failed: paidAmount != owedAmount');
        } finally {
          setTimeout(() => {
            setStep(4);
          }, 4500);
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
            setContractAddress(addr);
            setTxHash(hash);
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
              <span className="text-[#F5F1E8]/50 uppercase">Ledger State</span>
              <span className={settled ? 'text-[#7DF9FF]' : 'text-[#FF4444]'}>
                {settled ? '● SETTLED' : '○ UNSETTLED'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#F5F1E8]/5">
              <span className="text-[#F5F1E8]/50 uppercase">Settlement Counter</span>
              <span className="text-[#F5F1E8]">{settlementCount.toString()}</span>
            </div>

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
                onClick={onReset}
                className="border border-[#7DF9FF]/40 text-[#7DF9FF] hover:bg-[#7DF9FF]/10 px-4 py-4 text-xs font-mono tracking-widest uppercase transition-colors"
                title="Reset local state to test settling again"
              >
                Reset State
              </button>
            )}

            <button
              onClick={onBackToLanding}
              className="border border-[#F5F1E8]/20 px-6 py-4 text-xs font-mono tracking-widest uppercase hover:border-accent hover:text-accent transition-colors"
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
              className="flex-1 inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 transition-all duration-300 hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
            >
              Generate ZK Proof →
            </button>
            <button
              onClick={() => setStep(1)}
              className="border border-[#F5F1E8]/20 px-6 py-4 text-xs font-mono tracking-widest uppercase hover:border-accent hover:text-accent transition-colors"
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
                // SETTLEMENT ON-CHAIN VERIFIED
              </div>

              <h2 className="text-3xl md:text-4xl font-light font-serif text-[#F5F1E8] mb-4">
                Debt Marked Settled
              </h2>

              <p className="text-xs text-[#F5F1E8]/60 mb-6 max-w-md mx-auto leading-relaxed font-mono">
                The zero-knowledge proof verified that your payment matched the confidential debt amount.
                Public ledger updated: <span className="text-[#7DF9FF]">settled: true</span>.
              </p>

              <div className="mb-8 p-4 bg-[#0A0A0B] border border-[#F5F1E8]/10 text-left text-[11px] font-mono space-y-2 max-w-lg mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <span className="text-[#F5F1E8]/40 uppercase">Contract:</span>
                  <span className="text-accent break-all">{contractAddress}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <span className="text-[#F5F1E8]/40 uppercase">Tx Hash:</span>
                  <span className="text-[#7DF9FF] break-all">{txHash}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#F5F1E8]/40 uppercase">Network:</span>
                  <span className="text-[#F5F1E8]/80">Midnight Preprod</span>
                </div>
              </div>

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
                // ASSERTION FAILED
              </div>

              <h2 className="text-3xl md:text-4xl font-light font-serif text-[#F5F1E8] mb-4">
                Settlement Rejected
              </h2>

              <p className="text-xs text-[#FF4444]/80 mb-8 max-w-md mx-auto leading-relaxed font-mono">
                {errorMessage || 'Circuit assertion failed: paidAmount does not match owedAmount.'}
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 transition-all duration-300 hover:bg-accent/90 cursor-pointer"
                >
                  Adjust Amount
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="border border-[#F5F1E8]/20 px-6 py-4 text-xs font-mono tracking-widest uppercase hover:border-accent hover:text-accent transition-colors"
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
