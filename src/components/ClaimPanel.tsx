import React, { useState, useEffect } from 'react';
import { useMidnight } from '../hooks/useMidnight';
import { useContractState } from '../hooks/useContractState';
import {
  normalizeParticipantId,
  computeParticipantLeaf,
  MerkleProof,
} from '../merkle';
import { callClaimCircuit, toHex, fromHex, deriveUnshieldedIdentity } from '../midnightProviders';
import { Shield, Lock, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Key } from 'lucide-react';

interface ClaimPanelProps {
  activeContractAddress: string;
  setActiveContractAddress: (addr: string) => void;
}

export const ClaimPanel: React.FC<ClaimPanelProps> = ({
  activeContractAddress,
  setActiveContractAddress,
}) => {
  const { isConnected, getConnectedApi } = useMidnight();
  const { contractState, isLoading: isStateLoading, refreshState, checkIfClaimed } = useContractState(
    activeContractAddress
  );

  // Claim form fields
  const [voucherJson, setVoucherJson] = useState('');
  const [participantIdHex, setParticipantIdHex] = useState(
    '0x0101010101010101010101010101010101010101010101010101010101010101'
  );
  const [shareAmount, setShareAmount] = useState('150');
  const [saltHex, setSaltHex] = useState(
    '0x' + Array(32).fill('a1').join('')
  );
  const [proofJson, setProofJson] = useState('');

  // Proving state
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState<string | null>(null);
  const [txReceipt, setTxReceipt] = useState<{ txHash: string; blockHeight?: number | null } | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [savedVouchers, setSavedVouchers] = useState<any[]>([]);

  // Load saved vouchers from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('whisper_split_vouchers') || '[]');
      setSavedVouchers(stored);
      if (stored.length > 0 && (!activeContractAddress || activeContractAddress.length < 10)) {
        setActiveContractAddress(stored[0].contractAddress);
        loadVoucher(stored[0].pkg);
      }
    } catch {}
  }, []);

  const loadVoucher = (pkg: any) => {
    try {
      if (pkg.contractAddress) {
        setActiveContractAddress(pkg.contractAddress);
      }
      setParticipantIdHex(pkg.participantIdHex || pkg.participantId || '');
      setShareAmount(pkg.share || '0');
      setSaltHex(pkg.saltHex || '');
      setProofJson(JSON.stringify(pkg.proof, null, 2));
      setClaimError(null);
    } catch (e: any) {
      setClaimError('Invalid voucher format: ' + e.message);
    }
  };

  const handlePasteVoucher = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setVoucherJson(val);
    if (!val.trim()) return;

    try {
      const parsed = JSON.parse(val);
      loadVoucher(parsed);
    } catch (err: any) {
      setClaimError('Could not parse JSON voucher: ' + err.message);
    }
  };

  const isAlreadyClaimed = participantIdHex ? checkIfClaimed(participantIdHex) : false;

  const handleExecuteClaim = async () => {
    const api = getConnectedApi();
    if (!api || !isConnected) {
      setClaimError('Please connect your Midnight wallet first.');
      return;
    }
    if (!activeContractAddress || activeContractAddress.trim().length < 10) {
      setClaimError('Please specify a valid Whisper Split contract address.');
      return;
    }
    if (isAlreadyClaimed) {
      setClaimError('This participant share has already been claimed on-chain!');
      return;
    }

    setIsProving(true);
    setClaimError(null);
    setTxReceipt(null);

    try {
      // 1. Parse participant ID, share, and salt
      setProvingStep('1/4 Reconstructing private witness transcript (Share & Salt)...');
      const participantIdBytes = normalizeParticipantId(participantIdHex);
      const shareVal = BigInt(shareAmount);
      const saltBytes = fromHex(saltHex);

      if (saltBytes.length !== 32) {
        throw new Error('Secret salt must be 32 bytes (64 hex characters).');
      }

      // 2. Parse or build Merkle Proof
      setProvingStep('2/4 Validating Merkle tree membership proof path...');
      let proof: MerkleProof;
      if (proofJson.trim()) {
        const rawProof = JSON.parse(proofJson);
        proof = {
          leaf: rawProof.leafHex
            ? fromHex(rawProof.leafHex)
            : computeParticipantLeaf(participantIdBytes, shareVal, saltBytes),
          path: (rawProof.path || []).map((step: any) => ({
            sibling: { field: BigInt(step.siblingField || step.sibling?.field) },
            goes_left: Boolean(step.goes_left),
          })),
        };
      } else {
        // Fallback: 16-level default path
        const leaf = computeParticipantLeaf(participantIdBytes, shareVal, saltBytes);
        proof = {
          leaf,
          path: Array(16).fill({ sibling: { field: 0n }, goes_left: true }),
        };
      }

      // 3. Client-side ZK proof generation
      setProvingStep('3/4 Generating Client-Side Zero-Knowledge Proof (claim.bzkir)...');

      const { unshieldedAddress } = await api.getUnshieldedAddress();
      const recipientAddressBytes = deriveUnshieldedIdentity(unshieldedAddress);

      const result = await callClaimCircuit(
        api,
        activeContractAddress.trim(),
        participantIdBytes,
        recipientAddressBytes,
        shareVal,
        saltBytes,
        proof
      );

      // 4. Submission & Verification
      setProvingStep('4/4 Transaction confirmed on Midnight Network!');
      setTxReceipt({
        txHash: result.txHash,
        blockHeight: result.blockHeight,
      });

      // Refresh on-chain state
      await refreshState();
    } catch (err: any) {
      console.error('Claim failed:', err);
      setClaimError(err?.message || 'ZK Claim proof generation failed.');
    } finally {
      setIsProving(false);
      setProvingStep(null);
    }
  };

  return (
    <div className="space-y-8 font-mono">
      {/* Intro Banner */}
      <div className="border border-primary/10 bg-[#0C0C0E] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7DF9FF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-cyan text-xs uppercase tracking-widest mb-2">
          <Key className="w-4 h-4 text-cyan" />
          <span>// ZERO-KNOWLEDGE PRIVATE SHARE CLAIM</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-light text-primary mb-1">
              Claim Allocation with Zero-Knowledge Proof
            </h2>
            <p className="text-xs text-primary/70 max-w-2xl leading-relaxed">
              Generate a local ZK proof that you hold a valid participant allocation in the contract's Merkle tree.
              Your share amount and secret salt never leave your browser.
            </p>
          </div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7DF9FF]/10 border border-[#7DF9FF]/30 text-cyan text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-cyan" />
            <span>Proved without revealing your share amount</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Claim Voucher Input */}
        <div className="lg:col-span-8 space-y-6">
          {/* Saved Vouchers Quick Loader */}
          {savedVouchers.length > 0 && (
            <div className="border border-primary/10 bg-[#0C0C0E] p-4 space-y-2">
              <span className="text-[10px] text-primary/40 uppercase tracking-widest block">
                Quick Load from Local Pool Allocations
              </span>
              <div className="flex flex-wrap gap-2">
                {savedVouchers.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => loadVoucher(v.pkg)}
                    className="border border-[#2596be]/30 bg-[#2596be]/5 hover:bg-[#2596be]/15 px-3 py-1 text-xs text-[#7DF9FF] tracking-wider transition-colors"
                  >
                    {v.name} ({v.pkg.share} tNIGHT)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual / Voucher Paste Input */}
          <div className="border border-primary/10 bg-[#0C0C0E] p-5 space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-accent flex items-center justify-between">
              <span>// PARTICIPANT CREDENTIALS</span>
              <span className="text-[10px] text-primary/40 font-normal">Private Client-Side Inputs</span>
            </h3>

            {/* Contract Address */}
            <div className="space-y-1">
              <label className="text-[10px] text-primary/40 uppercase tracking-wider block">
                Split Contract Address
              </label>
              <input
                type="text"
                value={activeContractAddress}
                onChange={(e) => setActiveContractAddress(e.target.value)}
                placeholder="0x... contract address"
                className="w-full bg-[#0A0A0B] border border-primary/15 px-3 py-2 text-xs text-primary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Participant ID */}
            <div className="space-y-1">
              <label className="text-[10px] text-primary/40 uppercase tracking-wider block">
                Participant Public Identity (32-byte Hex)
              </label>
              <input
                type="text"
                value={participantIdHex}
                onChange={(e) => setParticipantIdHex(e.target.value)}
                placeholder="0x..."
                className="w-full bg-[#0A0A0B] border border-primary/15 px-3 py-2 text-xs text-[#7DF9FF] focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Private Share */}
              <div className="space-y-1">
                <label className="text-[10px] text-primary/40 uppercase tracking-wider block">
                  Private Share Amount (tNIGHT)
                </label>
                <input
                  type="number"
                  value={shareAmount}
                  onChange={(e) => setShareAmount(e.target.value)}
                  placeholder="150"
                  className="w-full bg-[#0A0A0B] border border-primary/15 px-3 py-2 text-xs text-primary focus:outline-none focus:border-accent"
                />
              </div>

              {/* Private Salt */}
              <div className="space-y-1">
                <label className="text-[10px] text-primary/40 uppercase tracking-wider block">
                  Private Secret Salt (32-byte Hex)
                </label>
                <input
                  type="text"
                  value={saltHex}
                  onChange={(e) => setSaltHex(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#0A0A0B] border border-primary/15 px-3 py-2 text-xs text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Paste Voucher Box */}
            <div className="space-y-1 pt-2 border-t border-primary/5">
              <label className="text-[10px] text-primary/40 uppercase tracking-wider flex items-center justify-between">
                <span>Or Paste Claim Voucher JSON</span>
                <span className="text-accent text-[9px]">Auto-fills all fields</span>
              </label>
              <textarea
                rows={2}
                value={voucherJson}
                onChange={handlePasteVoucher}
                placeholder='{"contractAddress": "0x...", "participantIdHex": "0x...", "share": "150", ...}'
                className="w-full bg-[#0A0A0B] border border-primary/15 p-2 text-[10px] text-primary/70 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* Claimed status banner */}
            {isAlreadyClaimed && (
              <div className="p-3 bg-[#FF4444]/10 border border-[#FF4444]/30 text-xs text-[#FF4444] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>This participant ID is already marked as CLAIMED in the contract state.</span>
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={handleExecuteClaim}
              disabled={isProving || !isConnected || isAlreadyClaimed}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 border text-xs font-mono tracking-widest uppercase transition-all duration-300 ${
                isProving || !isConnected || isAlreadyClaimed
                  ? 'border-primary/10 bg-primary/5 text-primary/30 cursor-not-allowed'
                  : 'border-[#7DF9FF] bg-[#7DF9FF]/15 text-[#7DF9FF] hover:bg-[#7DF9FF]/25 cursor-pointer shadow-[0_0_20px_rgba(125,249,255,0.15)]'
              }`}
            >
              {isProving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan" />
                  <span>Proving ZK Circuit...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan" />
                  <span>Execute Private Claim with ZK Proof</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Proving Steps & Live Contract Status */}
        <div className="lg:col-span-4 space-y-6">
          {/* On-Chain State */}
          <div className="border border-primary/10 bg-[#0C0C0E] p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-primary/5 pb-2">
              <h4 className="text-xs uppercase tracking-widest text-accent">// ON-CHAIN POOL STATUS</h4>
              <button
                onClick={() => refreshState()}
                className="text-[10px] text-primary/40 hover:text-cyan transition-colors cursor-pointer"
                title="Refresh State"
              >
                Refresh
              </button>
            </div>

            {contractState ? (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-primary/40 uppercase tracking-widest block mb-0.5">
                    Pool Remaining Custody
                  </span>
                  <div className="text-xl font-serif text-primary font-light">
                    {contractState.depositAmount.toString()}{' '}
                    <span className="text-sm font-mono text-cyan">tNIGHT</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-primary/40 uppercase tracking-widest block mb-0.5">
                    Successful Claims Count
                  </span>
                  <div className="text-sm font-mono text-primary">
                    {contractState.distributionCount.toString()} Claims Finalized
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-primary/40 uppercase tracking-widest block mb-0.5">
                    Contract Shares Root
                  </span>
                  <div className="text-[10px] text-[#7DF9FF] p-2 bg-[#0A0A0B] border border-primary/5 break-all">
                    {contractState.sharesRootHex}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-primary/40 text-[11px] py-4 text-center">
                {activeContractAddress ? 'Loading contract on-chain state...' : 'Enter contract address to inspect state.'}
              </div>
            )}
          </div>

          {/* ZK Proving Progress Card */}
          {isProving && (
            <div className="border border-cyan/40 bg-cyan/5 p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-2 text-cyan font-bold text-xs uppercase tracking-wider">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Zero-Knowledge Proof in Progress</span>
              </div>
              <p className="text-xs text-primary/80 leading-relaxed">{provingStep}</p>
              <div className="text-[10px] text-primary/50">
                ZK prover runs client-side inside WASM runtime. Dust fee sponsorship handled automatically.
              </div>
            </div>
          )}

          {/* Success Receipt */}
          {txReceipt && (
            <div className="border border-[#7DF9FF] bg-[#7DF9FF]/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#7DF9FF] font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-cyan" />
                <span>Claim Successfully Settled!</span>
              </div>
              <div className="text-xs text-primary/90 space-y-1">
                <div>
                  Tx Hash: <span className="text-[#7DF9FF] break-all">{txReceipt.txHash}</span>
                </div>
                {txReceipt.blockHeight && (
                  <div>
                    Block Height: <span className="text-primary">{txReceipt.blockHeight}</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-primary/60 border-t border-primary/10 pt-2">
                Your share tokens have been transferred from contract custody into your wallet.
              </div>
            </div>
          )}

          {/* Error Message */}
          {claimError && (
            <div className="border border-[#FF4444]/40 bg-[#FF4444]/10 p-4 text-xs text-[#FF4444] space-y-1">
              <div className="font-bold uppercase tracking-wider">Claim Execution Failed</div>
              <div className="break-all">{claimError}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimPanel;
