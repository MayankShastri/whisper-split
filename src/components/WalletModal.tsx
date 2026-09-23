import React from 'react';

type WalletModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (walletKey: '1am' | 'mnLace') => void;
  isConnecting: boolean;
};

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onSelectWallet,
  isConnecting,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(10, 10, 11, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>

      <div className="relative z-10 w-full max-w-md bg-[#0C0C0E] border border-[#F5F1E8]/20 p-6 sm:p-8 shadow-2xl font-mono mx-auto my-auto">
        <div className="absolute top-0 left-0 w-2 h-2 border-b border-r border-[#F5F1E8]/40"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-b border-l border-[#F5F1E8]/40"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-t border-r border-[#F5F1E8]/40"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-t border-l border-[#F5F1E8]/40"></div>

        <div className="flex items-center justify-between border-b border-[#F5F1E8]/10 pb-4 mb-6">
          <div>
            <div className="text-[10px] text-accent uppercase tracking-widest">
              // CONNECT WALLET
            </div>
            <h3 className="text-xl font-light font-serif text-[#F5F1E8]">
              Select Midnight Wallet
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#F5F1E8]/40 hover:text-accent transition-colors text-lg px-2 py-1 cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <button
            onClick={() => onSelectWallet('1am')}
            disabled={isConnecting}
            className="w-full flex items-center justify-between p-4 bg-[#0A0A0B] border border-[#F5F1E8]/15 hover:border-accent hover:bg-[#2596be]/5 transition-all text-left group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-[#F5F1E8]/20 bg-[#0C0C0E] flex items-center justify-center text-accent text-sm font-bold group-hover:border-accent">
                1AM
              </div>
              <div>
                <div className="text-xs text-[#F5F1E8] font-semibold tracking-wider">
                  1AM Wallet
                </div>
                <div className="text-[10px] text-[#7DF9FF]">
                  In-Browser WASM Proving
                </div>
              </div>
            </div>
            <span className="text-xs text-accent group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>

          <button
            onClick={() => onSelectWallet('mnLace')}
            disabled={isConnecting}
            className="w-full flex items-center justify-between p-4 bg-[#0A0A0B] border border-[#F5F1E8]/15 hover:border-accent hover:bg-[#2596be]/5 transition-all text-left group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-[#F5F1E8]/20 bg-[#0C0C0E] flex items-center justify-center text-[#7DF9FF] text-sm font-bold group-hover:border-accent">
                LACE
              </div>
              <div>
                <div className="text-xs text-[#F5F1E8] font-semibold tracking-wider">
                  Midnight Lace
                </div>
                <div className="text-[10px] text-[#F5F1E8]/50">
                  Official IOG Extension
                </div>
              </div>
            </div>
            <span className="text-xs text-accent group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>
        </div>

        <p className="text-[10px] text-[#F5F1E8]/40 leading-relaxed text-center">
          Make sure your chosen extension is unlocked and configured for the <span className="text-[#7DF9FF]">Preprod</span> network.
        </p>
      </div>
    </div>
  );
};
