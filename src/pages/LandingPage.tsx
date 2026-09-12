import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

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
  const headingWord1Ref = useRef<HTMLSpanElement>(null);
  const headingWord2Ref = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const metaBadgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Heading masked word-reveal animation with blur-in from reference
    const words = [headingWord1Ref.current, headingWord2Ref.current].filter(Boolean);
    if (words.length > 0) {
      gsap.fromTo(
        words,
        { yPercent: 115, opacity: 0, filter: 'blur(10px)' },
        {
          yPercent: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.15,
          delay: 0.1,
        }
      );
    }

    // 2. CTA button slide + blur-in entrance from reference
    if (buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { opacity: 0, y: 25, scale: 0.95, filter: 'blur(6px)' },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.9,
          ease: 'power3.out',
          delay: 0.35,
        }
      );
    }

    // 3. Metadata badge slide + blur-in from reference
    if (metaBadgeRef.current) {
      gsap.fromTo(
        metaBadgeRef.current,
        { opacity: 0, y: 20, filter: 'blur(6px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.9,
          ease: 'power3.out',
          delay: 0.45,
        }
      );
    }
  }, []);

  return (
    <div className="space-y-0 w-full">
      {/* 1. HERO SECTION */}
      <section className="relative pt-8 pb-16 flex flex-col justify-center items-start w-full border-b border-[#F5F1E8]/10">
        <div className="text-xs text-accent uppercase tracking-[0.2em] mb-4 font-mono">
          // 01 — ZERO-KNOWLEDGE DEBT SETTLEMENT
        </div>

        {/* Headings with masked word reveal */}
        <h1 className="text-5xl md:text-8xl lg:text-9xl font-light tracking-tighter font-serif text-[#F5F1E8] leading-[0.9] mb-8">
          <span className="inline-block overflow-hidden align-bottom">
            <span ref={headingWord1Ref} className="inline-block">
              Sound,
            </span>
          </span>
          <br />
          <span className="inline-block overflow-hidden align-bottom">
            <span ref={headingWord2Ref} className="inline-block italic text-[#F5F1E8]/90">
              before silence.
            </span>
          </span>
        </h1>

        <div className="mt-4 flex flex-col md:flex-row md:items-center gap-8 md:gap-12 w-full">
          <div>
            <button
              ref={buttonRef}
              onClick={isConnected ? onStartSettlement : onConnect}
              className="group relative inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 overflow-hidden transition-all duration-300 hover:bg-accent/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] cursor-pointer"
            >
              {isConnected ? 'Open Settlement Console →' : 'Connect Lace & Settle →'}
            </button>
          </div>

          <div ref={metaBadgeRef} className="max-w-md text-xs leading-relaxed text-[#F5F1E8]/60 font-mono">
            <span className="text-[#F5F1E8] font-mono block mb-1">
              v1.0 — Confidential Ledger State.
            </span>
            Settle shared expenses directly on Midnight blockchain. Validates payment equality in
            zero-knowledge without broadcasting balances.
          </div>
        </div>

        {/* Hero Footer Metrics */}
        <div className="mt-16 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-[#F5F1E8]/10 pt-6 text-[10px] text-[#F5F1E8]/40 font-mono uppercase tracking-widest">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div>PROOF TYPE: <span className="text-accent">ZK-SNARK COMPACT</span></div>
            <div className="hidden sm:block text-[#F5F1E8]/20">|</div>
            <div>DISCLOSED: <span className="text-[#7DF9FF]">0.00 (SHIELDED)</span></div>
            <div className="hidden sm:block text-[#F5F1E8]/20">|</div>
            <div>NETWORK: <span className="text-[#F5F1E8]/60">MIDNIGHT PREPROD</span></div>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <span className="w-2 h-2 rounded-full bg-[#7DF9FF] animate-pulse"></span>
            SYSTEM STATUS: ONLINE
          </div>
        </div>
      </section>

      {/* 2. ARCHITECTURE OVERVIEW */}
      <section id="protocol" className="border-b border-[#F5F1E8]/10 py-16 scroll-mt-24 w-full">
        <div>
          <div className="text-xs text-accent uppercase tracking-[0.2em] mb-12">
            // 02 — ARCHITECTURE OVERVIEW
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#F5F1E8]/10">
            {/* Column 01 */}
            <div className="py-8 lg:py-0 lg:px-8 first:pl-0 last:pr-0 flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="text-xs text-[#F5F1E8]/40 mb-6 font-mono">01 // LOCAL-SYNC</div>
                <h3 className="text-xl font-light text-[#F5F1E8] font-serif mb-3 tracking-tight">
                  Lace Wallet Sync
                </h3>
                <p className="text-xs text-[#F5F1E8]/60 leading-relaxed font-mono">
                  Connect your pre-funded Midnight Lace wallet. Credentials, viewing keys, and unshielded balances remain isolated on your device.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between">
                <svg className="w-24 h-6 text-accent" viewBox="0 0 100 30" fill="none">
                  <path d="M0,15 Q15,0 30,15 T60,15 T90,5 T100,15" stroke="currentColor" strokeWidth="1" fill="none"></path>
                  <circle cx="60" cy="15" r="2" fill="#7DF9FF"></circle>
                </svg>
                <span className="text-[9px] text-[#F5F1E8]/30 font-mono">WALLET.SYNC.01</span>
              </div>
            </div>

            {/* Column 02 */}
            <div className="py-8 lg:py-0 lg:px-8 flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="text-xs text-[#F5F1E8]/40 mb-6 font-mono">02 // WITNESS-EVAL</div>
                <h3 className="text-xl font-light text-[#F5F1E8] font-serif mb-3 tracking-tight">
                  ZK Witness Check
                </h3>
                <p className="text-xs text-[#F5F1E8]/60 leading-relaxed font-mono">
                  The settleDebt Compact circuit evaluates payment against the private getOwedAmount witness. No numbers are stored publicly.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between">
                <svg className="w-24 h-6 text-[#7DF9FF]" viewBox="0 0 100 30" fill="none">
                  <circle cx="50" cy="15" r="12" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2"></circle>
                  <circle cx="50" cy="15" r="4" fill="#2596be"></circle>
                </svg>
                <span className="text-[9px] text-[#F5F1E8]/30 font-mono">WITNESS.VERIFY.ZKP</span>
              </div>
            </div>

            {/* Column 03 */}
            <div className="py-8 lg:py-0 lg:px-8 flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="text-xs text-[#F5F1E8]/40 mb-6 font-mono">03 // DISCLOSE-ASSERT</div>
                <h3 className="text-xl font-light text-[#F5F1E8] font-serif mb-3 tracking-tight">
                  State Settlement
                </h3>
                <p className="text-xs text-[#F5F1E8]/60 leading-relaxed font-mono">
                  Only the boolean equality result is explicitly disclosed. Once verified by validators, on-chain settled status updates to true.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between">
                <svg className="w-24 h-6 text-[#F5F1E8]/40" viewBox="0 0 100 30" fill="none">
                  <line x1="10" y1="5" x2="90" y2="25" stroke="currentColor" strokeWidth="0.75"></line>
                  <line x1="10" y1="25" x2="90" y2="5" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1 3"></line>
                </svg>
                <span className="text-[9px] text-[#F5F1E8]/30 font-mono">DISCLOSE.ASSERT.03</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRIVACY GUARANTEE */}
      <section className="py-16 w-full">
        <div className="border-b border-[#F5F1E8]/10 pb-4 mb-8">
          <span className="text-xs text-accent uppercase tracking-[0.2em] font-mono">
            // 03 — PRIVACY ALLOCATIONS
          </span>
          <h2 className="text-3xl font-serif text-[#F5F1E8] font-light mt-1">
            Data Ledger Disclosures
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#F5F1E8]/15 border border-[#F5F1E8]/15 bg-[#0C0C0E]">
          {/* Public column */}
          <div className="p-8 md:p-10 space-y-4">
            <span className="text-[10px] text-[#FF4444] uppercase tracking-widest font-mono">
              PUBLIC LEDGER TRANSCRIPT (ON-CHAIN)
            </span>
            <ul className="space-y-3 text-xs font-mono text-[#F5F1E8]/70">
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
          <div className="p-8 md:p-10 space-y-4">
            <span className="text-[10px] text-[#7DF9FF] uppercase tracking-widest font-mono">
              ZERO-KNOWLEDGE WITNESS ENVIRONMENT
            </span>
            <ul className="space-y-3 text-xs font-mono text-[#F5F1E8]/70">
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
