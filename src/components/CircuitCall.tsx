import React from 'react';
import { SettlementFlow } from '../pages/SettlementFlow';

type CircuitCallProps = {
  settled: boolean;
  settlementCount: bigint;
  onSettle: (amount: bigint) => Promise<boolean>;
  onReset: () => void;
  onBackToLanding: () => void;
};

export const CircuitCall: React.FC<CircuitCallProps> = ({
  settled,
  settlementCount,
  onSettle,
  onReset,
  onBackToLanding,
}) => {
  return (
    <SettlementFlow
      settled={settled}
      settlementCount={settlementCount}
      onSettle={onSettle}
      onReset={onReset}
      onBackToLanding={onBackToLanding}
    />
  );
};
