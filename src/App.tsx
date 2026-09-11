import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { CircuitCall } from './components/CircuitCall';
import { useMidnight } from './hooks/useMidnight';

export const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'settlement'>('landing');
  const midnight = useMidnight();

  return (
    <Layout
      walletAddress={midnight.walletAddress}
      isConnecting={midnight.isConnecting}
      isConnected={midnight.isConnected}
      error={midnight.error}
      onConnect={midnight.connect}
      onDisconnect={midnight.disconnect}
      onLogoClick={() => setView('landing')}
    >
      {view === 'landing' ? (
        <LandingPage
          isConnected={midnight.isConnected}
          onConnect={midnight.connect}
          onStartSettlement={() => setView('settlement')}
        />
      ) : (
        <CircuitCall
          settled={midnight.settled}
          settlementCount={midnight.settlementCount}
          onSettle={midnight.settle}
          onBackToLanding={() => setView('landing')}
        />
      )}
    </Layout>
  );
};

export default App;
