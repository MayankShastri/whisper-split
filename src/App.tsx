import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { CircuitCall } from './components/CircuitCall';
import { useMidnight } from './hooks/useMidnight';
import { WalletModal } from './components/WalletModal';

export const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'settlement'>('landing');
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
    >
      {view === 'landing' ? (
        <LandingPage
          isConnected={midnight.isConnected}
          onConnect={() => setIsModalOpen(true)}
          onStartSettlement={() => setView('settlement')}
        />
      ) : (
        <CircuitCall
          onBackToLanding={() => setView('landing')}
        />
      )}

      {/* Global Wallet Selection Modal for Hero CTA */}
      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectWallet={handleConnectWallet}
        isConnecting={midnight.isConnecting}
      />
    </Layout>
  );
};

export default App;
