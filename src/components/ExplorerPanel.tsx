import React, { useState } from 'react';
import { useContractState } from '../hooks/useContractState';
import { Search, RefreshCw, ShieldCheck, Check, X, Database } from 'lucide-react';

interface ExplorerPanelProps {
  activeContractAddress: string;
  setActiveContractAddress: (addr: string) => void;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({
  activeContractAddress,
  setActiveContractAddress,
}) => {
  const [searchAddr, setSearchAddr] = useState(activeContractAddress || '');
  const [checkParticipantHex, setCheckParticipantHex] = useState('');

  const { contractState, isLoading, error, refreshState, checkIfClaimed } = useContractState(
    searchAddr
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveContractAddress(searchAddr);
  };

  const isCheckedClaimed = checkParticipantHex.trim()
    ? checkIfClaimed(checkParticipantHex.trim())
    : null;

  return (
    <div className="space-y-8 font-mono">
      {/* Intro Header */}
      <div className="border border-primary/10 bg-[#0C0C0E] p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 text-accent text-xs uppercase tracking-widest mb-2">
          <Database className="w-4 h-4 text-accent" />
          <span>// MIDNIGHT PREPROD LEDGER EXPLORER</span>
        </div>
        <h2 className="text-2xl font-serif font-light text-primary mb-2">
          Public Contract State & Verification
        </h2>
        <p className="text-xs text-primary/70 max-w-3xl leading-relaxed">
          Inspect the live public state of any Whisper Split contract. Contrast the minimal on-chain public state
          (Merkle root, pool balance, claim status) with private participant allocations.
        </p>
      </div>

      {/* Contract Query Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
          <input
            type="text"
            value={searchAddr}
            onChange={(e) => setSearchAddr(e.target.value)}
            placeholder="Search Split Contract Address (0x...)"
            className="w-full bg-[#0C0C0E] border border-primary/15 pl-9 pr-4 py-3 text-xs text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 border border-accent bg-[#2596be]/10 text-cyan hover:bg-[#2596be]/20 text-xs font-mono uppercase tracking-widest transition-all"
        >
          {isLoading ? 'Querying...' : 'Query Indexer'}
        </button>
      </form>

      {/* State View */}
      {error && (
        <div className="border border-[#FF4444]/40 bg-[#FF4444]/10 p-4 text-xs text-[#FF4444]">
          {error}
        </div>
      )}

      {contractState ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Merkle Root */}
          <div className="border border-primary/10 bg-[#0C0C0E] p-5 space-y-2">
            <span className="text-[10px] text-primary/40 uppercase tracking-widest block">
              Ledger sharesRoot
            </span>
            <div className="text-[11px] text-[#7DF9FF] font-bold break-all bg-[#0A0A0B] p-3 border border-primary/5">
              {contractState.sharesRootHex}
            </div>
            <p className="text-[10px] text-primary/50">
              16-level cryptographic tree root committing to all participant shares and secret salts.
            </p>
          </div>

          {/* Card 2: Custody Deposit Amount */}
          <div className="border border-primary/10 bg-[#0C0C0E] p-5 space-y-2">
            <span className="text-[10px] text-primary/40 uppercase tracking-widest block">
              Ledger depositAmount
            </span>
            <div className="text-3xl font-serif text-primary font-light">
              {contractState.depositAmount.toString()}{' '}
              <span className="text-sm font-mono text-cyan">tNIGHT</span>
            </div>
            <p className="text-[10px] text-primary/50">
              Current shielded pool balance held in custody by the contract.
            </p>
          </div>

          {/* Card 3: Distribution Count */}
          <div className="border border-primary/10 bg-[#0C0C0E] p-5 space-y-2">
            <span className="text-[10px] text-primary/40 uppercase tracking-widest block">
              Ledger distributionCount
            </span>
            <div className="text-3xl font-serif text-primary font-light">
              {contractState.distributionCount.toString()}{' '}
              <span className="text-sm font-mono text-accent">Claims</span>
            </div>
            <p className="text-[10px] text-primary/50">
              Monotonically increasing counter of successful share claims settled on-chain.
            </p>
          </div>

          {/* Participant Claim Checker */}
          <div className="md:col-span-3 border border-primary/10 bg-[#0C0C0E] p-5 space-y-4">
            <h4 className="text-xs uppercase tracking-widest text-accent">// QUERY PARTICIPANT CLAIM STATUS</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <input
                type="text"
                value={checkParticipantHex}
                onChange={(e) => setCheckParticipantHex(e.target.value)}
                placeholder="Participant Identity (32-byte Hex or Address)"
                className="md:col-span-9 bg-[#0A0A0B] border border-primary/15 px-3 py-2 text-xs text-primary focus:outline-none focus:border-accent"
              />
              <div className="md:col-span-3 flex items-center justify-center p-2 bg-[#0A0A0B] border border-primary/10 text-xs">
                {checkParticipantHex.trim() ? (
                  isCheckedClaimed ? (
                    <span className="text-accent flex items-center gap-1.5 font-bold">
                      <Check className="w-4 h-4 text-cyan" /> CLAIMED
                    </span>
                  ) : (
                    <span className="text-primary/60 flex items-center gap-1.5">
                      <X className="w-4 h-4 text-primary/30" /> UNCLAIMED
                    </span>
                  )
                ) : (
                  <span className="text-primary/30 text-[10px]">Enter ID to check</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        !error && (
          <div className="border border-primary/10 bg-[#0C0C0E] p-12 text-center text-xs text-primary/40 space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-primary/20" />
            <div>Enter a contract address above to query live ledger state from the Midnight Indexer.</div>
          </div>
        )
      )}
    </div>
  );
};

export default ExplorerPanel;
