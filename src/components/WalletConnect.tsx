import React, { useState } from 'react';
import { WalletModal } from './WalletModal';

type WalletConnectProps = {
  address: string | null;
  walletName?: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  onConnectWallet: (walletKey: '1am' | 'mnLace') => void;
  onDisconnect: () => void;
};

export const WalletConnect: React.FC<WalletConnectProps> = ({
  address,
  walletName,
  isConnecting,
  isConnected,
  error,
  onConnectWallet,
  onDisconnect,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (error) {
    return (
      <>
        <div className="flex items-center gap-3 border border-[#FF4444]/40 bg-[#FF4444]/10 px-4 py-2 text-xs font-mono text-[#FF4444]">
          <span>ERROR: {error}</span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="underline hover:text-primary transition-colors uppercase tracking-widest text-[10px]"
          >
            Change Wallet
          </button>
        </div>
        <WalletModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectWallet={(key) => {
            setIsModalOpen(false);
            onConnectWallet(key);
          }}
          isConnecting={isConnecting}
        />
      </>
    );
  }

  if (isConnected && address) {
    const truncated = `${address.slice(0, 10)}...${address.slice(-6)}`;
    return (
      <div className="flex items-center gap-3 bg-[#0C0C0E] border border-primary/10 px-4 py-2 text-xs font-mono">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7DF9FF] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7DF9FF]"></span>
        </span>
        {walletName && (
          <span className="text-accent text-[10px] uppercase tracking-wider">{walletName}:</span>
        )}
        <span className="text-primary/80 uppercase tracking-widest text-[11px]">{truncated}</span>
        <button
          onClick={onDisconnect}
          className="text-primary/40 hover:text-accent transition-colors ml-2 text-[10px] uppercase tracking-widest cursor-pointer"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isConnecting}
        className={`inline-flex items-center justify-center border border-primary/20 px-5 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-300 hover:border-accent hover:text-accent ${
          isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {isConnecting ? (
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 border-t-2 border-accent rounded-full animate-spin"></span>
            Connecting...
          </span>
        ) : (
          'Connect Wallet'
        )}
      </button>

      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectWallet={(key) => {
          setIsModalOpen(false);
          onConnectWallet(key);
        }}
        isConnecting={isConnecting}
      />
    </>
  );
};

export default WalletConnect;
