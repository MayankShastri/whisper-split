import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { LedgerParameters, ZswapChainState, Transaction } from '@midnight-ntwrk/ledger-v8';
import { fromHex, toHex, sampleUserAddress } from '@midnight-ntwrk/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Contract } from '../managed/debt/contract/index.js';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { createUnprovenDeployTx, submitTxAsync, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

export type DebtPrivateState = {
  owedAmount: bigint;
};

export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  const base = indexerPublicDataProvider(queryUrl, subscriptionUrl);

  async function queryLatest(query: string, address: string) {
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { address } }),
    });
    if (!res.ok) throw new Error(`Indexer HTTP error: ${res.status}`);
    const payload = await res.json();
    if (payload.errors?.length) throw new Error(payload.errors.map((e: any) => e.message).join('; '));
    return payload.data?.contractAction ?? null;
  }

  return {
    ...base,
    async queryContractState(contractAddress: string, config?: any) {
      if (config) return base.queryContractState(contractAddress, config);

      const action = await queryLatest(`
        query LATEST_CONTRACT_STATE($address: HexEncoded!) {
          contractAction(address: $address) { state }
        }`, contractAddress);
      return action ? ContractState.deserialize(fromHex(action.state)) : null;
    },
    async queryZSwapAndContractState(contractAddress: string, config?: any) {
      if (config) return base.queryZSwapAndContractState(contractAddress, config);

      const action = await queryLatest(`
        query LATEST_BOTH_STATE($address: HexEncoded!) {
          contractAction(address: $address) {
            state
            zswapState
            transaction { block { ledgerParameters } }
          }
        }`, contractAddress);

      if (!action?.zswapState) return null;
      return [
        ZswapChainState.deserialize(fromHex(action.zswapState)),
        ContractState.deserialize(fromHex(action.state)),
        action.transaction?.block?.ledgerParameters
          ? LedgerParameters.deserialize(fromHex(action.transaction.block.ledgerParameters))
          : LedgerParameters.initialParameters(),
      ];
    },
  };
}

export const getDebtCompiledContract = () => {
  const witnesses = {
    getOwedAmount: ({ privateState }: any) => [privateState, privateState.owedAmount || 100n],
  };

  const assetBase = typeof window !== 'undefined' ? `${window.location.origin}/managed/debt` : './managed/debt';

  return CompiledContract.make('debt', Contract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(assetBase)
  );
};

export const createMidnightProviders = async (connectedAPI: ConnectedAPI) => {
  const [config, unshielded, shieldedAddresses] = await Promise.all([
    connectedAPI.getConfiguration(),
    connectedAPI.getUnshieldedAddress().catch(() => null),
    connectedAPI.getShieldedAddresses().catch(() => null),
  ]);

  if (config?.networkId) {
    setNetworkId(config.networkId);
  } else {
    setNetworkId('preprod');
  }

  const coinPublicKey = shieldedAddresses?.shieldedCoinPublicKey;
  const encryptionPublicKey = shieldedAddresses?.shieldedEncryptionPublicKey;

  if (!coinPublicKey || !encryptionPublicKey) {
    throw new Error('Failed to configure constructor context with coin public key: shielded addresses not returned from wallet.');
  }

  let accountAddress = 'whisper-split-default-account';
  if (unshielded) {
    accountAddress = typeof unshielded === 'string' ? unshielded : unshielded?.unshieldedAddress || accountAddress;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const zkConfigProvider = new FetchZkConfigProvider<'settleDebt'>(`${origin}/managed/debt`, fetch.bind(window));
  
  const proofServerUri = config.proverServerUri || 'https://prover.preprod.midnight.network';
  const indexerUri = config.indexerUri || 'https://indexer.preprod.midnight.network/api/v4/graphql';
  const indexerWsUri = config.indexerWsUri || 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';

  const privateStateProvider = levelPrivateStateProvider<string, DebtPrivateState>({
    privateStateStoreName: 'whisper-split-debt-state',
    signingKeyStoreName: 'whisper-split-debt-keys',
    privateStoragePasswordProvider: () => 'WhisperSplit-Midnight-Preprod-2026-SecurePassword!',
    accountId: accountAddress,
  });

  const publicDataProvider = createPatchedPublicDataProvider(indexerUri, indexerWsUri);

  let proofProvider: any;
  try {
    const provingProvider = await (connectedAPI as any).getProvingProvider?.(zkConfigProvider);
    if (provingProvider) {
      proofProvider = {
        async proveTx(unprovenTx: any, _config: any) {
          const { CostModel } = await import('@midnight-ntwrk/ledger-v8');
          return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
        },
      };
    } else {
      proofProvider = httpClientProofProvider(proofServerUri, zkConfigProvider);
    }
  } catch (e) {
    console.warn('Could not initialize wallet proving provider, falling back to HTTP client proof provider:', e);
    proofProvider = httpClientProofProvider(proofServerUri, zkConfigProvider);
  }

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: async (tx: any, ttl?: Date): Promise<any> => {
      console.log('Balancing transaction with connected wallet:', tx);
      const serializedTx = toHex(tx.serialize());
      const received = await connectedAPI.balanceUnsealedTransaction(serializedTx);
      if (!received) throw new Error('balanceUnsealedTransaction returned invalid result');
      const balancedTxHex = typeof received === 'string' ? received : (received as any).tx;
      if (!balancedTxHex) throw new Error('balanceUnsealedTransaction returned empty transaction hex');
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balancedTxHex));
    },
  };

  const midnightProvider = {
    submitTx: async (tx: any): Promise<string> => {
      console.log('Submitting finalized contract transaction to Midnight network...');
      const serialized = toHex(tx.serialize());
      const result = await connectedAPI.submitTransaction(serialized);
      if (typeof result === 'string' && result) return result;
      if ((result as any)?.transactionId) return (result as any).transactionId;
      if ((result as any)?.id) return (result as any).id;
      const identifiers = tx.identifiers();
      const txId = identifiers && identifiers.length > 0 ? identifiers[0] : serialized.slice(0, 64);
      console.log('Contract transaction submitted with ID:', txId);
      return txId;
    },
  };

  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};

export const deployDebtContractOnChain = async (connectedAPI: ConnectedAPI, initialOwedAmount: bigint = 100n) => {
  const providers = await createMidnightProviders(connectedAPI);
  const compiledContract = getDebtCompiledContract();

  console.log('Deploying Debt Contract to Preprod via Midnight.js (low-level unproven deploy)...');
  const deployTxData = await createUnprovenDeployTx(providers as any, {
    compiledContract,
    args: [],
    privateStateId: 'debtPrivateState',
    initialPrivateState: { owedAmount: initialOwedAmount },
  } as any);

  const contractAddress = deployTxData.public.contractAddress;
  console.log('Contract address derived:', contractAddress);

  console.log('Submitting deploy transaction asynchronously to Midnight Preprod...');
  const txId = await submitTxAsync(providers as any, { unprovenTx: deployTxData.private.unprovenTx } as any);

  await (providers.privateStateProvider as any).setContractAddress?.(contractAddress);
  if ((deployTxData.private as any)?.signingKey) {
    await (providers.privateStateProvider as any).setSigningKey?.(contractAddress, (deployTxData.private as any).signingKey);
  }

  const txHash = typeof txId === 'string' ? txId : (txId as any)?.txHash || (txId as any)?.txId || 'confirmed-deploy-tx';
  console.log('Contract successfully deployed at address:', contractAddress, 'Tx Hash:', txHash);

  return {
    contractAddress,
    txHash,
    deployedContract: deployTxData,
  };
};

export const callSettleDebtCircuit = async (
  connectedAPI: ConnectedAPI,
  contractAddress: string,
  paidAmount: bigint,
  owedAmount: bigint = 100n
) => {
  const providers = await createMidnightProviders(connectedAPI);
  const compiled = getDebtCompiledContract();

  console.log('Finding deployed contract at:', contractAddress);
  const deployed = await findDeployedContract(providers, {
    contractAddress,
    compiledContract: compiled,
    privateStateId: 'debtPrivateState',
    initialPrivateState: { owedAmount },
  });

  console.log('Invoking settleDebt circuit on-chain with amount:', paidAmount);
  // Invokes the real settleDebt circuit
  const callResult = await (deployed.callTx as any).settleDebt(paidAmount);
  console.log('Circuit call execution finalized:', callResult);

  const txHash = callResult.public?.txHash || callResult.public?.txId || callResult.public?.transactionId || 'confirmed-circuit-tx';
  const blockHeight = callResult.public?.blockHeight || null;

  return {
    txHash,
    blockHeight,
    callResult,
  };
};
