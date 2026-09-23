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
      {/* HERO SECTION */}
      <section className="relative pt-6 pb-16 flex flex-col justify-center items-start w-full border-b border-[#F5F1E8]/10">
        <div className="text-xs text-accent uppercase tracking-[0.2em] mb-4 font-mono">
          // 01 — PRIVATE PAYROLL & GROUP SPLITS
        </div>

        {/* Big Editorial Headline */}
        <h1 className="text-5xl md:text-8xl lg:text-9xl font-light tracking-tighter font-serif text-[#F5F1E8] leading-[0.9] mb-8">
          <span className="inline-block overflow-hidden align-bottom">
            <span ref={headingWord1Ref} className="inline-block">
              Pooled funds,
            </span>
          </span>
          <br />
          <span className="inline-block overflow-hidden align-bottom">
            <span ref={headingWord2Ref} className="inline-block italic text-[#F5F1E8]/90">
              private shares.
            </span>
          </span>
        </h1>

        <div className="mt-4 flex flex-col md:flex-row md:items-center gap-8 md:gap-12 w-full">
          <div>
            <button
              ref={buttonRef}
              onClick={onStartSettlement}
              className="group relative inline-flex items-center justify-center bg-accent text-[#0A0A0B] font-semibold text-xs tracking-widest uppercase px-8 py-4 overflow-hidden transition-all duration-300 hover:bg-accent/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] cursor-pointer"
            >
              Open Payroll Console →
            </button>
          </div>

          <div ref={metaBadgeRef} className="max-w-md text-xs leading-relaxed text-[#F5F1E8]/60 font-mono">
            <span className="text-[#F5F1E8] font-mono block mb-1">
              v3.0 — Shielded Custody & Distribution.
            </span>
            Distribute team salaries, contractor payouts, and shared DAO pools on Midnight blockchain. Verifies Merkle share entitlements in zero-knowledge without revealing individual compensation amounts.
          </div>
        </div>

        {/* Hero Footer Metrics */}
        <div className="mt-16 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-[#F5F1E8]/10 pt-6 text-[10px] text-[#F5F1E8]/40 font-mono uppercase tracking-widest">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div>PROOF ENGINE: <span className="text-accent">ZK-SNARK COMPACT</span></div>
            <div className="hidden sm:block text-[#F5F1E8]/20">|</div>
            <div>INDIVIDUAL SHARES: <span className="text-[#7DF9FF]">SHIELDED BY WITNESS</span></div>
            <div className="hidden sm:block text-[#F5F1E8]/20">|</div>
            <div>NETWORK: <span className="text-[#F5F1E8]/60">MIDNIGHT PREPROD</span></div>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <span className="w-2 h-2 rounded-full bg-[#7DF9FF] animate-pulse"></span>
            NETWORK STATUS: NOT VERIFIED
          </div>
        </div>
      </section>

      {/* PROTOCOL ARCHITECTURE */}
      <section id="protocol" className="border-b border-[#F5F1E8]/10 py-16 scroll-mt-24 w-full">
        <div>
          <div className="text-xs text-accent uppercase tracking-[0.2em] mb-12 font-mono">
            // 02 — PROTOCOL ARCHITECTURE
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#F5F1E8]/10">
            {/* Column 01 */}
            <div className="py-8 lg:py-0 lg:px-8 first:pl-0 last:pr-0 flex flex-col justify-between min-h-[240px]">
              <div>
                <div className="text-xs text-[#F5F1E8]/40 mb-4 font-mono">01 // POOL-CUSTODY</div>
                <h3 className="text-xl font-light text-[#F5F1E8] font-serif mb-3 tracking-tight">
                  Shielded Custody
                </h3>
                <p className="text-xs text-[#F5F1E8]/60 leading-relaxed font-mono">
                  The organizer pools funds into contract custody with a single Merkle root committing to all participant allocations.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between">
                <span className="text-[9px] text-[#F5F1E8]/30 font-mono">CUSTODY.DEPOSIT.01</span>
              </div>
            </div>

            {/* Column 02 */}
            <div className="py-8 lg:py-0 lg:px-8 flex flex-col justify-between min-h-[240px]">
              <div>
                <div className="text-xs text-[#F5F1E8]/40 mb-4 font-mono">02 // MERKLE-WITNESS</div>
                <h3 className="text-xl font-light text-[#F5F1E8] font-serif mb-3 tracking-tight">
                  ZK Membership Proof
                </h3>
                <p className="text-xs text-[#F5F1E8]/60 leading-relaxed font-mono">
                  Each recipient presents a private witness of their share, salt, and Merkle path. The circuit verifies entitlement against the root.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between">
                <span className="text-[9px] text-[#F5F1E8]/30 font-mono">MERKLE.VERIFY.ZKP</span>
              </div>
            </div>

            {/* Column 03 */}
            <div className="py-8 lg:py-0 lg:px-8 flex flex-col justify-between min-h-[240px]">
              <div>
                <div className="text-xs text-[#F5F1E8]/40 mb-4 font-mono">03 // PULL-DISTRIBUTION</div>
                <h3 className="text-xl font-light text-[#F5F1E8] font-serif mb-3 tracking-tight">
                  Confidential Payout
                </h3>
                <p className="text-xs text-[#F5F1E8]/60 leading-relaxed font-mono">
                  Recipients claim their payout on-chain. Public ledger marks claim status without revealing numerical share amounts.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F5F1E8]/5 flex items-center justify-between">
                <span className="text-[9px] text-[#F5F1E8]/30 font-mono">CLAIM.PAYOUT.03</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY ALLOCATIONS */}
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
                <span>Shares Merkle Root</span>
                <span className="text-[#F5F1E8]">Field Digest (Root Hash)</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Total Pool Balance</span>
                <span className="text-[#F5F1E8]">Uint64 (Contract Custody)</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Distribution Counter</span>
                <span className="text-[#F5F1E8]">Counter (Total Claims)</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Claimed Status</span>
                <span className="text-[#F5F1E8]">Map&lt;Bytes32, Boolean&gt;</span>
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
                <span>Individual Share Amounts</span>
                <span className="text-[#7DF9FF]">SHIELDED BY WITNESS</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Secret Salt Nonce</span>
                <span className="text-[#7DF9FF]">NEVER DISCLOSED</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Merkle Path Preimages</span>
                <span className="text-[#7DF9FF]">PRIVATE PROOF TRACE</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#F5F1E8]/5 pb-2">
                <span>Peer Allocation Breakdown</span>
                <span className="text-[#7DF9FF]">HIDDEN FROM CO-WORKERS</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
