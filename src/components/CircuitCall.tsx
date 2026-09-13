import React from 'react';
import { SettlementFlow } from '../pages/SettlementFlow';

type CircuitCallProps = {
  onBackToLanding: () => void;
};

export const CircuitCall: React.FC<CircuitCallProps> = ({
  onBackToLanding,
}) => {
  return (
    <SettlementFlow
      onBackToLanding={onBackToLanding}
    />
  );
};
