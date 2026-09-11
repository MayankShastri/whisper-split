import React from 'react';

type LandingPageProps = {
  onStartSettlement: () => void;
  isConnected: boolean;
  onConnect: () => void;
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartSettlement,
  isConnected,
  onConnect,
}) => {
  return (
    <div className="space-y-32">
      {/* 1. HERO SECTION */}
      <section className="relative py-12 flex flex-col justify-center items-start max-w-5xl">
        <div className="text-xs text-accent uppercase tracking-[0.2em] mb-6 font-mono">
          // 01 — ZERO-KNOWLEDGE DEBT SETTLEMENT
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tighter font-serif text-[#F5F1E8] leading-[0.95] mb-8">
          Settle debts.<br />
          <span className="italic text-[#F5F1E8]/90">Reveal nothing.</span>
        </h1>

        <p className="max-w-xl text-xs md:text-sm leading-relaxed text-[#F5F1E8]/60 font-mono mb-10">
          Whisper Split enables confidential expense balancing on the Midnight blockchain.
          Prove full debt settlement using zero-knowledge circuits without disclosing amounts or personal financial ledgers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
          <button
            onClick={isConnected ? onStartSettlement : onConnect}
            className="group relative inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 overflow-hidden transition-all duration-300 hover:bg-accent/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] cursor-pointer"
          >
            {isConnected ? 'Open Settlement Console →' : 'Connect Lace & Settle →'}
          </button>

          <a
            href="#protocol"
            className="inline-flex items-center justify-center border border-[#F5F1E8]/20 px-6 py-4 text-xs font-mono tracking-widest uppercase transition-all duration-300 hover:border-accent hover:text-accent"
          >
            How it Works
          </a>
        </div>

        {/* Hero Footer Metrics */}
        <div className="mt-16 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-[#F5F1E8]/10 pt-6 text-[10px] text-[#F5F1E8]/40 font-mono uppercase tracking-widest">
          <div>PROOF TYPE: <span className="text-accent">ZK-SNARK COMPACT</span></div>
          <div>AMOUNT DISCLOSED: <span className="text-[#7DF9FF]">0.00 (SHIELDED)</span></div>
          <div>NETWORK: <span className="text-[#F5F1E8]">MIDNIGHT PREPROD</span></div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section id="protocol" className="space-y-12 scroll-mt-24">
        <div className="border-b border-[#F5F1E8]/10 pb-4">
          <span className="text-xs text-accent uppercase tracking-[0.2em] font-mono">
            // 02 — SETTLEMENT PROTOCOL
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-[#F5F1E8] font-light mt-1">
            Privacy-First Lifecycle
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 bg-[#0C0C0E] border border-[#F5F1E8]/15 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
            <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-[#F5F1E8]/30"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-[#F5F1E8]/30"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-[#F5F1E8]/30"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-[#F5F1E8]/30"></div>

            <div>
              <div className="text-[10px] text-accent uppercase tracking-widest font-mono mb-4">
                01 // CONNECT
              </div>
              <h3 className="text-xl font-serif font-light text-[#F5F1E8] mb-3">
                Lace Wallet Sync
              </h3>
              <p className="text-xs text-[#F5F1E8]/60 font-mono leading-relaxed">
                Connect your pre-funded Midnight Lace wallet. Identity and balances remain isolated locally.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between text-[9px] text-[#F5F1E8]/30 font-mono">
              <span>LOCAL IDENTITY</span>
              <span className="text-[#7DF9FF]">SHIELDED</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 bg-[#0C0C0E] border border-[#F5F1E8]/15 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
            <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-[#F5F1E8]/30"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-[#F5F1E8]/30"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-[#F5F1E8]/30"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-[#F5F1E8]/30"></div>

            <div>
              <div className="text-[10px] text-accent uppercase tracking-widest font-mono mb-4">
                02 // VALIDATE
              </div>
              <h3 className="text-xl font-serif font-light text-[#F5F1E8] mb-3">
                ZK Witness Check
              </h3>
              <p className="text-xs text-[#F5F1E8]/60 font-mono leading-relaxed">
                Circuit checks whether your payment matches the private owed amount without writing numbers to storage.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between text-[9px] text-[#F5F1E8]/30 font-mono">
              <span>COMPACT CIRCUIT</span>
              <span className="text-accent">ZERO DISCLOSURE</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-8 bg-[#0C0C0E] border border-[#F5F1E8]/15 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
            <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-[#F5F1E8]/30"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-[#F5F1E8]/30"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-[#F5F1E8]/30"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-[#F5F1E8]/30"></div>

            <div>
              <div className="text-[10px] text-accent uppercase tracking-widest font-mono mb-4">
                03 // SETTLE
              </div>
              <h3 className="text-xl font-serif font-light text-[#F5F1E8] mb-3">
                On-Chain Verification
              </h3>
              <p className="text-xs text-[#F5F1E8]/60 font-mono leading-relaxed">
                The browser proof is validated on Midnight ledger. Only the boolean settled state flips to true.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between text-[9px] text-[#F5F1E8]/30 font-mono">
              <span>LEDGER STATE</span>
              <span className="text-[#7DF9FF]">SETTLED: TRUE</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRIVACY COMPARISON */}
      <section className="space-y-12">
        <div className="border-b border-[#F5F1E8]/10 pb-4">
          <span className="text-xs text-accent uppercase tracking-[0.2em] font-mono">
            // 03 — PRIVACY GUARANTEE
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-[#F5F1E8] font-light mt-1">
            Visible vs Shielded Data
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#F5F1E8]/15 border border-[#F5F1E8]/15 bg-[#0C0C0E]">
          {/* Public column */}
          <div className="p-8 md:p-12 space-y-6">
            <span className="text-xs text-[#FF4444] uppercase tracking-widest font-mono">
              WHAT ON-CHAIN OBSERVERS SEE
            </span>
            <ul className="space-y-4 text-xs font-mono text-[#F5F1E8]/70">
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Settled Status Flag</span>
                <span className="text-[#F5F1E8]">Boolean (true/false)</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Total Settlements</span>
                <span className="text-[#F5F1E8]">Counter value</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Contract Address</span>
                <span className="text-[#F5F1E8]">02008f31b...</span>
              </li>
            </ul>
          </div>

          {/* Private column */}
          <div className="p-8 md:p-12 space-y-6">
            <span className="text-xs text-[#7DF9FF] uppercase tracking-widest font-mono">
              WHAT STAYS PRIVATE (ZERO-KNOWLEDGE)
            </span>
            <ul className="space-y-4 text-xs font-mono text-[#F5F1E8]/70">
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Amount Owed</span>
                <span className="text-[#7DF9FF]">SHIELDED BY WITNESS</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Amount Paid</span>
                <span className="text-[#7DF9FF]">NEVER DISCLOSED</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Debtor Identity</span>
                <span className="text-[#7DF9FF]">ANONYMIZED PROOF</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
