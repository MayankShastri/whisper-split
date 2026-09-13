import React from 'react';
import { WalletConnect } from './WalletConnect';
import WebGLBackground from './WebGLBackground';

type LayoutProps = {
  children: React.ReactNode;
  walletAddress: string | null;
  walletName?: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  onConnectWallet: (walletKey: '1am' | 'mnLace') => void;
  onDisconnect: () => void;
  onLogoClick?: () => void;
};

export const Layout: React.FC<LayoutProps> = ({
  children,
  walletAddress,
  walletName,
  isConnecting,
  isConnected,
  error,
  onConnectWallet,
  onDisconnect,
  onLogoClick,
}) => {
  return (
    <div className="relative min-h-screen bg-[#0A0A0B] text-[#F5F1E8] font-mono selection:bg-[#2596be] selection:text-[#0A0A0B] overflow-x-hidden flex flex-col justify-between">
      <WebGLBackground />

      <header className="relative z-20 border-b border-[#F5F1E8]/10 bg-[#0A0A0B]/90 backdrop-blur-md sticky top-0 px-6 py-4 flex items-center justify-between">
        <button
          onClick={onLogoClick}
          className="text-xl font-light tracking-tighter uppercase font-serif hover:text-accent transition-colors flex items-center gap-3 text-left"
        >
          <span>WHISPER SPLIT</span>
          <span className="text-[10px] font-mono tracking-widest uppercase text-accent bg-[#2596be]/10 px-2 py-0.5 border border-[#2596be]/20">
            L2 // PREPROD
          </span>
        </button>

        <div className="flex items-center gap-6">
          <WalletConnect
            address={walletAddress}
            walletName={walletName}
            isConnecting={isConnecting}
            isConnected={isConnected}
            error={error}
            onConnectWallet={onConnectWallet}
            onDisconnect={onDisconnect}
          />
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 md:px-12 py-12 flex flex-col justify-center">
        {children}
      </main>

      <footer className="relative z-10 border-t border-[#F5F1E8]/10 bg-[#050506] py-8 px-6 text-xs text-[#F5F1E8]/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span>© 2026 Whisper Split. Zero-Knowledge Debt Settlement.</span>
        </div>
        <div className="flex items-center gap-6 text-[10px] tracking-widest uppercase">
          <span className="text-accent">// 1AM & LACE COMPATIBLE</span>
          <span className="text-[#7DF9FF]">ZK-SNARK PRIVACY SHIELD</span>
        </div>
      </footer>
    </div>
  );
};
