import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { createUnprovenDeployTx, submitTxAsync, submitCallTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
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
  providers.privateStateProvider.setContractAddress(contractAddress);
  await providers.privateStateProvider.set('debtPrivateState', state);

  // submitCallTxAsync returns immediately after submission instead of blocking on
  // publicDataProvider.watchForTxData, which hangs on preprod's offset:null indexer bug —
  // the previous findDeployedContract().callTx.settleDebt() path never resolved, leaving
  // the UI stuck on "Processing settlement…" even after wallet approval.
  const { txId } = await submitCallTxAsync(providers as any, {
    contractAddress,
    compiledContract: getDebtCompiledContract(),
    circuitId: 'settleDebt',
    privateStateId: 'debtPrivateState',
    args: [state.owedAmount],
  } as any);
  return { txHash: txId };
}

export { ledger as debtLedger };
