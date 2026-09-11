import React from 'react';
import { SettlementFlow } from '../pages/SettlementFlow';

type CircuitCallProps = {
  settled: boolean;
  settlementCount: bigint;
  onSettle: (amount: bigint) => Promise<boolean>;
  onBackToLanding: () => void;
};

export const CircuitCall: React.FC<CircuitCallProps> = ({
  settled,
  settlementCount,
  onSettle,
  onBackToLanding,
}) => {
  return (
    <SettlementFlow
      settled={settled}
      settlementCount={settlementCount}
      onSettle={onSettle}
      onBackToLanding={onBackToLanding}
    />
  );
};
