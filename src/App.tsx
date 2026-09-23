import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { SettlementFlow } from './pages/SettlementFlow';
import { MidnightProvider, useMidnight } from './hooks/useMidnight';
import { CircuitCall } from './components/CircuitCall';
import { WalletModal } from './components/WalletModal';

const AppContent: React.FC = () => {
  const [view, setView] = useState<'landing' | 'settlement' | 'debt'>('landing');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const midnight = useMidnight();

  const handleConnectWallet = (walletKey: '1am' | 'mnLace') => {
    setIsModalOpen(false);
    midnight.connect(walletKey);
  };

  return (
    <Layout
      walletAddress={midnight.walletAddress}
      walletName={midnight.walletName}
      isConnecting={midnight.isConnecting}
      isConnected={midnight.isConnected}
      error={midnight.error}
      onConnectWallet={handleConnectWallet}
      onDisconnect={midnight.disconnect}
      onLogoClick={() => setView('landing')}
      onOpenConsole={() => setView('settlement')}
      isConsoleActive={view === 'settlement'}
    >
      <nav aria-label="Application screens" className="flex flex-wrap gap-4 mb-8 text-xs uppercase">
        <button aria-pressed={view === 'debt'} onClick={() => setView('debt')} className="border border-accent px-4 py-3">Debt settlement</button>
        <button aria-pressed={view === 'settlement'} onClick={() => setView('settlement')} className="border border-accent px-4 py-3">Payroll console</button>
      </nav>
      {view === 'debt' ? (
        <CircuitCall key={`${midnight.walletAddress}:${midnight.selectedWalletKey}`} onBackToLanding={() => setView('landing')} />
      ) : view === 'landing' ? (
        <LandingPage
          isConnected={midnight.isConnected}
          onConnect={() => setIsModalOpen(true)}
          onStartSettlement={() => setView('settlement')}
        />
      ) : (
        <SettlementFlow
          key={`${midnight.walletAddress}:${midnight.selectedWalletKey}`}
          onBackToLanding={() => setView('landing')}
          onOpenWalletModal={() => setIsModalOpen(true)}
        />
      )}

      {/* Global Wallet Selection Modal */}
      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectWallet={handleConnectWallet}
        isConnecting={midnight.isConnecting}
      />
    </Layout>
  );
};

export const App: React.FC = () => <MidnightProvider><AppContent /></MidnightProvider>;

export default App;
