import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { createUnprovenDeployTx, submitTxAsync, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { Contract, ledger, type Witnesses } from '../managed/debt/contract/index.js';
import { createMidnightProviders } from './midnightProviders';

export type DebtPrivateState = { owedAmount: bigint };

export function generateDebtPrivateState(): DebtPrivateState {
  const bytes = crypto.getRandomValues(new Uint32Array(2));
  return { owedAmount: ((BigInt(bytes[0]) << 32n) | BigInt(bytes[1])) || 1n };
}

export function getDebtCompiledContract() {
  const witnesses: Witnesses<DebtPrivateState> = {
    getOwedAmount: ({ privateState }) => [privateState, privateState.owedAmount],
  };
  return CompiledContract.make('debt', Contract<DebtPrivateState>).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(`${window.location.origin}/managed/debt`),
  );
}

export async function deployDebtContractOnChain(api: ConnectedAPI, state: DebtPrivateState) {
  const providers = await createMidnightProviders<DebtPrivateState, 'debt'>(api, 'debt');
  const deployment = await createUnprovenDeployTx(providers, {
    compiledContract: getDebtCompiledContract(),
    signingKey: sampleSigningKey(),
    initialPrivateState: state,
  });
  const txHash = await submitTxAsync(providers, { unprovenTx: deployment.private.unprovenTx });
  return { contractAddress: deployment.public.contractAddress, txHash };
}

export async function callSettleDebtCircuit(api: ConnectedAPI, contractAddress: string, state: DebtPrivateState) {
  const providers = await createMidnightProviders<DebtPrivateState, 'debt'>(api, 'debt');
  const deployed = await findDeployedContract(providers, {
    contractAddress,
    compiledContract: getDebtCompiledContract(),
    privateStateId: 'debtPrivateState',
    initialPrivateState: state,
  });
  const result = await deployed.callTx.settleDebt(state.owedAmount);
  return { txHash: result.public.txHash };
}

export { ledger as debtLedger };
