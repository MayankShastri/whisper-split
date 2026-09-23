import React, { useState, useEffect } from 'react';
import { useMidnight } from '../hooks/useMidnight';
import {
  buildSplitMerkleTree,
  generateRandomSalt,
  normalizeParticipantId,
  exportParticipantPackage,
  ParticipantEntry,
  SplitTreeResult,
} from '../merkle';
import { deploySplitContractOnChain, callDepositCircuit, toHex } from '../midnightProviders';
import { Plus, Trash2, Shield, Lock, Download, Copy, Check, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface ParticipantFormItem {
  id: string;
  name: string;
  share: string;
  saltHex: string;
}

interface DepositPanelProps {
  activeContractAddress: string;
  setActiveContractAddress: (addr: string) => void;
  onDeploySuccess?: (contractAddress: string, treeResult: SplitTreeResult) => void;
}

export const DepositPanel: React.FC<DepositPanelProps> = ({
  activeContractAddress,
  setActiveContractAddress,
  onDeploySuccess,
}) => {
  const { isConnected, getConnectedApi } = useMidnight();

  const [participants, setParticipants] = useState<ParticipantFormItem[]>([
    {
      id: '0x0101010101010101010101010101010101010101010101010101010101010101',
      name: 'Alice (Lead Architect)',
      share: '150',
      saltHex: '0x' + toHex(generateRandomSalt()),
    },
    {
      id: '0x0202020202020202020202020202020202020202020202020202020202020202',
      name: 'Bob (Core Engineer)',
      share: '100',
      saltHex: '0x' + toHex(generateRandomSalt()),
    },
    {
      id: '0x0303030303030303030303030303030303030303030303030303030303030303',
      name: 'Charlie (ZK Cryptographer)',
      share: '50',
      saltHex: '0x' + toHex(generateRandomSalt()),
    },
  ]);

  const [treeResult, setTreeResult] = useState<SplitTreeResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recalculate tree automatically when participant entries change
  useEffect(() => {
    try {
      setCalcError(null);
      const raw = participants.map((p) => {
        const shareVal = BigInt(p.share || '0');
        if (shareVal <= 0n) throw new Error(`Share for ${p.name || 'participant'} must be greater than 0`);
        return {
          id: p.id,
          share: shareVal,
        };
      });

      const res = buildSplitMerkleTree(raw);
      setTreeResult(res);
    } catch (e: any) {
      setCalcError(e.message || 'Error computing Merkle tree');
      setTreeResult(null);
    }
  }, [participants]);

  const handleAddParticipant = () => {
    const nextIdx = participants.length + 1;
    const randId = '0x' + Array(32).fill(nextIdx.toString(16).padStart(2, '0')).join('');
    setParticipants([
      ...participants,
      {
        id: randId,
        name: `Participant #${nextIdx}`,
        share: '50',
        saltHex: '0x' + toHex(generateRandomSalt()),
      },
    ]);
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 1) return;
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof ParticipantFormItem, value: string) => {
    const copy = [...participants];
    copy[index] = { ...copy[index], [field]: value };
    setParticipants(copy);
  };

  const handleDeployContract = async () => {
    const api = getConnectedApi();
    if (!api || !isConnected) {
      setErrorMessage('Please connect your Midnight wallet first.');
      return;
    }
    if (!treeResult) {
      setErrorMessage('Invalid Merkle tree. Check participant inputs.');
      return;
    }

    setIsDeploying(true);
    setErrorMessage(null);
    setTxHash(null);
    setActionStatus('1/3 Proving unproven contract deployment locally...');

    try {
      const deployResult = await deploySplitContractOnChain(api, {
        share: 0n,
        salt: new Uint8Array(32),
      });

      setActiveContractAddress(deployResult.contractAddress);
      setTxHash(deployResult.txHash);
      setActionStatus(`Contract deployed at ${deployResult.contractAddress}! Initializing pool with deposit circuit...`);

      // Call deposit circuit
      setIsDepositing(true);
      setActionStatus('2/3 Proving deposit circuit with Merkle root & pool custody balance...');
      const depositResult = await callDepositCircuit(
        api,
        deployResult.contractAddress,
        treeResult.root,
        treeResult.totalDeposit
      );

      setTxHash(depositResult.txHash);
      setActionStatus('3/3 Pool successfully funded in custody on Midnight Preprod!');

      // Save claim vouchers to localStorage
      if (treeResult.participants) {
        const stored = JSON.parse(localStorage.getItem('whisper_split_vouchers') || '[]');
        treeResult.participants.forEach((p, idx) => {
          const pkgStr = exportParticipantPackage(p, deployResult.contractAddress);
          stored.unshift({
            contractAddress: deployResult.contractAddress,
            name: participants[idx]?.name || `Participant ${idx + 1}`,
            pkg: JSON.parse(pkgStr),
            createdAt: new Date().toISOString(),
          });
        });
        localStorage.setItem('whisper_split_vouchers', JSON.stringify(stored));
      }

      onDeploySuccess?.(deployResult.contractAddress, treeResult);
    } catch (e: any) {
      console.error('Deploy/Deposit failed:', e);
      setErrorMessage(e?.message || 'Deploy / Deposit failed. Check extension logs.');
    } finally {
      setIsDeploying(false);
      setIsDepositing(false);
    }
  };

  const handleDepositExisting = async () => {
    const api = getConnectedApi();
    if (!api || !isConnected) {
      setErrorMessage('Please connect your Midnight wallet first.');
      return;
    }
    if (!activeContractAddress || activeContractAddress.trim().length < 10) {
      setErrorMessage('Please enter a valid deployed contract address.');
      return;
    }
    if (!treeResult) {
      setErrorMessage('Invalid Merkle tree.');
      return;
    }

    setIsDepositing(true);
    setErrorMessage(null);
    setTxHash(null);
    setActionStatus('Generating ZK proof for deposit circuit...');

    try {
      const depositResult = await callDepositCircuit(
        api,
        activeContractAddress.trim(),
        treeResult.root,
        treeResult.totalDeposit
      );
      setTxHash(depositResult.txHash);
      setActionStatus('Pool custody successfully deposited!');
    } catch (e: any) {
      console.error('Deposit failed:', e);
      setErrorMessage(e?.message || 'Deposit circuit call failed.');
    } finally {
      setIsDepositing(false);
    }
  };

  const copyVoucher = (p: ParticipantEntry, index: number) => {
    const pkg = exportParticipantPackage(p, activeContractAddress || '0x_PENDING_DEPLOYMENT');
    navigator.clipboard.writeText(pkg);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 2500);
  };

  return (
    <div className="space-y-8 font-mono">
      {/* Intro Banner */}
      <div className="border border-primary/10 bg-[#0C0C0E] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#2596be]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-accent text-xs uppercase tracking-widest mb-2">
          <Shield className="w-4 h-4 text-accent" />
          <span>// PRIVATE PAYROLL & SPLIT POOL SETUP</span>
        </div>
        <h2 className="text-2xl font-serif font-light text-primary mb-2">
          Deposit Shielded Pool & Commit Merkle Root
        </h2>
        <p className="text-xs text-primary/70 max-w-3xl leading-relaxed">
          The creator deposits the total shielded funds into contract custody and publishes a 16-level Merkle root
          committing to each participant's allocation. Individual share amounts, participant keys, and secret salts
          remain 100% private client-side.
        </p>
      </div>

      {/* Main Form & Computation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Participant Allocation Builder */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-widest text-primary/90 flex items-center gap-2">
              <span>Split Participants</span>
              <span className="text-[10px] bg-[#2596be]/10 text-cyan px-2 py-0.5 border border-[#2596be]/30">
                {participants.length} Members
              </span>
            </h3>
            <button
              onClick={handleAddParticipant}
              className="inline-flex items-center gap-1.5 border border-accent/40 bg-[#2596be]/10 text-cyan hover:bg-[#2596be]/20 px-3 py-1.5 text-xs uppercase tracking-wider transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Participant
            </button>
          </div>

          <div className="space-y-4">
            {participants.map((p, idx) => (
              <div
                key={idx}
                className="border border-primary/10 bg-[#0C0C0E] p-5 space-y-3 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-primary/5 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-accent tracking-wider font-bold">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handleUpdate(idx, 'name', e.target.value)}
                      placeholder="Participant Label / Role"
                      className="bg-transparent text-xs text-primary font-bold focus:outline-none focus:border-b focus:border-accent"
                    />
                  </div>
                  {participants.length > 1 && (
                    <button
                      onClick={() => handleRemoveParticipant(idx)}
                      className="text-primary/30 hover:text-[#FF4444] transition-colors p-1"
                      title="Remove participant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  {/* Participant ID */}
                  <div className="md:col-span-7 space-y-1">
                    <label className="text-[10px] text-primary/40 uppercase tracking-wider block">
                      Participant Identity (32-byte Hex or Address)
                    </label>
                    <input
                      type="text"
                      value={p.id}
                      onChange={(e) => handleUpdate(idx, 'id', e.target.value)}
                      placeholder="0x010101..."
                      className="w-full bg-[#0A0A0B] border border-primary/15 px-3 py-2 text-[11px] text-[#7DF9FF] focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Share Amount */}
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[10px] text-primary/40 uppercase tracking-wider block">
                      Private Share Amount (tNIGHT)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={p.share}
                      onChange={(e) => handleUpdate(idx, 'share', e.target.value)}
                      placeholder="100"
                      className="w-full bg-[#0A0A0B] border border-primary/15 px-3 py-2 text-[11px] text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Salt and Copy Voucher */}
                <div className="flex items-center justify-between pt-1 text-[10px] text-primary/40">
                  <div className="flex items-center gap-2 truncate max-w-md">
                    <Lock className="w-3 h-3 text-accent" />
                    <span className="truncate">Secret Salt: {p.saltHex.slice(0, 14)}...{p.saltHex.slice(-8)}</span>
                  </div>
                  {treeResult?.participants[idx] && (
                    <button
                      onClick={() => copyVoucher(treeResult.participants[idx], idx)}
                      className="inline-flex items-center gap-1 text-cyan hover:underline cursor-pointer"
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check className="w-3 h-3 text-cyan" /> Copied Voucher JSON!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Claim Voucher
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {calcError && (
            <div className="flex items-center gap-2 border border-[#FF4444]/40 bg-[#FF4444]/10 p-3 text-xs text-[#FF4444]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{calcError}</span>
            </div>
          )}

          {/* Action Area */}
          <div className="border border-primary/10 bg-[#0C0C0E] p-5 space-y-4">
            <h4 className="text-xs uppercase tracking-widest text-accent">// CONTRACT DEPLOYMENT & DEPOSIT</h4>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDeployContract}
                disabled={isDeploying || isDepositing || !isConnected || !treeResult}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border text-xs font-mono tracking-widest uppercase transition-all duration-300 ${
                  isDeploying || isDepositing || !isConnected || !treeResult
                    ? 'border-primary/10 bg-primary/5 text-primary/30 cursor-not-allowed'
                    : 'border-accent bg-accent/20 text-[#7DF9FF] hover:bg-accent/30 cursor-pointer shadow-[0_0_15px_rgba(37,150,190,0.2)]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan" />
                {isDeploying ? 'Deploying & Proving...' : 'Deploy & Deposit New Pool'}
              </button>
            </div>

            {/* Existing contract deposit */}
            <div className="pt-3 border-t border-primary/5 space-y-2">
              <label className="text-[10px] text-primary/40 uppercase tracking-wider block">
                Or Deposit to Existing Deployed Contract
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activeContractAddress}
                  onChange={(e) => setActiveContractAddress(e.target.value)}
                  placeholder="Contract Address (Hex)"
                  className="flex-1 bg-[#0A0A0B] border border-primary/15 px-3 py-2 text-xs text-primary focus:outline-none focus:border-accent"
                />
                <button
                  onClick={handleDepositExisting}
                  disabled={isDepositing || isDeploying || !isConnected || !treeResult}
                  className="border border-primary/20 px-4 py-2 text-xs uppercase tracking-wider text-primary hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  {isDepositing ? 'Depositing...' : 'Deposit'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Merkle Tree & Cryptographic Ledger Preview */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-primary/10 bg-[#0C0C0E] p-5 space-y-5">
            <h4 className="text-xs uppercase tracking-widest text-accent border-b border-primary/5 pb-2">
              // CRYPTOGRAPHIC MERKLE STATE
            </h4>

            {treeResult ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] text-primary/40 uppercase tracking-widest block mb-1">
                    Computed Merkle Root (Public Field)
                  </span>
                  <div className="p-2.5 bg-[#0A0A0B] border border-[#7DF9FF]/20 text-[#7DF9FF] text-[11px] break-all">
                    {treeResult.rootHex}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-primary/40 uppercase tracking-widest block mb-1">
                    Total Pool Custody Deposit
                  </span>
                  <div className="text-2xl font-serif text-primary font-light">
                    {treeResult.totalDeposit.toString()} <span className="text-sm font-mono text-cyan">tNIGHT</span>
                  </div>
                </div>

                <div className="border-t border-primary/5 pt-3 space-y-2">
                  <span className="text-[10px] text-primary/40 uppercase tracking-widest block">
                    Participant Leaves (Client-Side)
                  </span>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {treeResult.participants.map((p, i) => (
                      <div key={i} className="p-2 bg-[#0A0A0B] border border-primary/5 text-[10px] space-y-1">
                        <div className="flex justify-between text-primary/80 font-bold">
                          <span>{participants[i]?.name || p.id}</span>
                          <span className="text-cyan">{p.share.toString()} tNIGHT</span>
                        </div>
                        <div className="text-primary/40 truncate">
                          Leaf: {p.leafBytes ? '0x' + toHex(p.leafBytes).slice(0, 16) + '...' : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-[#7DF9FF]/5 border border-[#7DF9FF]/20 text-[11px] text-primary/80 leading-relaxed">
                  <span className="text-cyan font-bold">Privacy Guarantee:</span> Only the root hash and total pool
                  balance are posted on-chain. Zero participant identities or individual share values are leaked.
                </div>
              </div>
            ) : (
              <div className="text-xs text-primary/40 text-center py-8">
                Enter valid participant allocations to preview the Merkle commitment.
              </div>
            )}
          </div>

          {/* Status / Error Box */}
          {(actionStatus || errorMessage || txHash) && (
            <div
              className={`border p-4 text-xs space-y-2 ${
                errorMessage
                  ? 'border-[#FF4444]/40 bg-[#FF4444]/10 text-[#FF4444]'
                  : 'border-[#7DF9FF]/30 bg-[#7DF9FF]/5 text-[#7DF9FF]'
              }`}
            >
              <div className="font-bold uppercase tracking-wider">
                {errorMessage ? 'Error' : 'Transaction Status'}
              </div>
              <div className="break-all">{errorMessage || actionStatus}</div>
              {txHash && (
                <div className="text-[10px] text-primary/60 break-all pt-1 border-t border-primary/10">
                  Tx ID: <span className="text-primary">{txHash}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepositPanel;
