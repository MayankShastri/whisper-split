import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { deployDebtContractOnChain, generateDebtPrivateState } from './debtProviders';

export async function deployToPreprod(api: ConnectedAPI) {
  return deployDebtContractOnChain(api, generateDebtPrivateState());
}
