import React from 'react';
import { Shield, Lock, Eye, EyeOff, Layers, Cpu, ArrowRight, Zap } from 'lucide-react';

interface OverviewPanelProps {
  onGoToDeposit: () => void;
  onGoToClaim: () => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  onGoToDeposit,
  onGoToClaim,
}) => {
  return (
    <div className="space-y-12 font-mono">
      {/* Hero Section */}
      <div className="relative border border-primary/10 bg-[#0C0C0E] p-8 md:p-12 overflow-hidden">
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-[#2596be]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 border border-accent/30 bg-[#2596be]/10 px-3 py-1 text-xs text-[#7DF9FF] uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" />
            <span>Midnight Preprod • Zero-Knowledge Split & Payroll</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-light text-primary tracking-tight leading-tight">
            Confidential Payroll & Merkleized Payouts
          </h1>

          <p className="text-sm text-primary/70 leading-relaxed max-w-2xl">
            Whisper Split enables organizations to pool and distribute funds to participants without exposing individual
            compensation, contractor rates, or split ratios. Verified cryptographically with Zero-Knowledge proofs on the
            Midnight blockchain.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={onGoToDeposit}
              className="inline-flex items-center gap-2 bg-[#2596be] hover:bg-[#2596be]/80 text-[#0A0A0B] font-bold text-xs uppercase tracking-widest px-6 py-3.5 transition-all shadow-[0_0_20px_rgba(37,150,190,0.3)]"
            >
              <span>Deposit Pool & Commit Root</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onGoToClaim}
              className="inline-flex items-center gap-2 border border-primary/20 hover:border-cyan text-primary hover:text-cyan text-xs uppercase tracking-widest px-6 py-3.5 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Privately Claim Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Architecture Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-primary/10 bg-[#0C0C0E] p-6 space-y-3">
          <div className="w-10 h-10 border border-accent/30 bg-[#2596be]/10 flex items-center justify-center text-cyan">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg text-primary">1. Merkle Tree Commitment</h3>
          <p className="text-xs text-primary/70 leading-relaxed">
            The employer commits all participant allocations into a single 16-level cryptographic Merkle root. No participant
            names or individual numbers appear on the public ledger.
          </p>
        </div>

        <div className="border border-primary/10 bg-[#0C0C0E] p-6 space-y-3">
          <div className="w-10 h-10 border-accent/30 bg-[#2596be]/10 flex items-center justify-center text-cyan border">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg text-primary">2. Client-Side ZK Proving</h3>
          <p className="text-xs text-primary/70 leading-relaxed">
            Participants compute zero-knowledge proofs locally in their browser using Compact WASM proving circuits. The
            proof demonstrates leaf membership without revealing the secret share.
          </p>
        </div>

        <div className="border border-primary/10 bg-[#0C0C0E] p-6 space-y-3">
          <div className="w-10 h-10 border-accent/30 bg-[#2596be]/10 flex items-center justify-center text-cyan border">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg text-primary">3. Zero Gas Fees & Dust Sponsorship</h3>
          <p className="text-xs text-primary/70 leading-relaxed">
            Built-in 1AM / ProofStation wallet integration sponsors all transaction fees (DUST). Users pay zero gas to claim
            their private payouts.
          </p>
        </div>
      </div>

      {/* Privacy Model Breakdown Table */}
      <div className="border border-primary/10 bg-[#0C0C0E] p-8 space-y-6">
        <h3 className="text-sm text-accent uppercase tracking-widest">// PRIVACY MODEL & SELECTIVE DISCLOSURE</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Public Ledger */}
          <div className="border border-primary/10 bg-[#0A0A0B] p-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan font-bold text-xs uppercase tracking-wider">
              <Eye className="w-4 h-4 text-cyan" />
              <span>Public Ledger State (Visible On-Chain)</span>
            </div>
            <ul className="space-y-2 text-xs text-primary/80">
              <li className="flex items-start gap-2">
                <span className="text-cyan">•</span>
                <span><code className="text-cyan">sharesRoot: Field</code> — The 32-byte Merkle tree root</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan">•</span>
                <span><code className="text-cyan">depositAmount: Uint&lt;64&gt;</code> — Total pool custody balance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan">•</span>
                <span><code className="text-cyan">distributionCount: Counter</code> — Total claims executed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan">•</span>
                <span><code className="text-cyan">claimed: Map&lt;Bytes&lt;32&gt;, Boolean&gt;</code> — Public claim status</span>
              </li>
            </ul>
          </div>

          {/* Private Off-Chain State */}
          <div className="border border-primary/10 bg-[#0A0A0B] p-5 space-y-3">
            <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider">
              <EyeOff className="w-4 h-4 text-accent" />
              <span>Private Witness State (Zero Leakage)</span>
            </div>
            <ul className="space-y-2 text-xs text-primary/80">
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <span><code className="text-accent">getMyShare(): Uint&lt;64&gt;</code> — Individual payout amount</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <span><code className="text-accent">getMySecretSalt(): Bytes&lt;32&gt;</code> — Identity hiding salt</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <span><code className="text-accent">getMerkleProof()</code> — 16-level tree membership path</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <span>Other participants' identities & salary allocations</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPanel;
