import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { createMemoryPrivateStateProvider } from './privateState';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { LedgerParameters, ZswapChainState, Transaction } from '@midnight-ntwrk/ledger-v8';
import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { fromHex as crFromHex, toHex as crToHex } from '@midnight-ntwrk/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Contract, ledger, type Witnesses } from '../managed/split/contract/index.js';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { createUnprovenDeployTx, submitTxAsync, submitCallTxAsync } from '@midnight-ntwrk/midnight-js-contracts';

export type SplitPrivateState = {
  share: bigint;
  salt: Uint8Array;
  proof: {
    leaf: Uint8Array;
    path: Array<{
      sibling: { field: bigint };
      goes_left: boolean;
    }>;
  };
};

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(normalized)) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string): PublicDataProvider {
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
    async queryContractState(contractAddress, config) {
      if (config) return base.queryContractState(contractAddress, config);

      const action = await queryLatest(`
        query LATEST_CONTRACT_STATE($address: HexEncoded!) {
          contractAction(address: $address) { state }
        }`, contractAddress);
      return action ? ContractState.deserialize(fromHex(action.state)) : null;
    },
    async queryZSwapAndContractState(contractAddress, config): ReturnType<PublicDataProvider['queryZSwapAndContractState']> {
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

export const getSplitCompiledContract = () => {
  const witnesses: Witnesses<SplitPrivateState> = {
    getMyShare: ({ privateState }: any) => [
      privateState,
      privateState?.share !== undefined ? privateState.share : 0n,
    ],
    getMySecretSalt: ({ privateState }: any) => [
      privateState,
      privateState?.salt || new Uint8Array(32),
    ],
    getMerkleProof: ({ privateState }: any) => [
      privateState,
      privateState?.proof || {
        leaf: new Uint8Array(32),
        path: Array(16).fill({ sibling: { field: 0n }, goes_left: true }),
      },
    ],
  };

  const assetBase = typeof window !== 'undefined' ? `${window.location.origin}/managed/split` : './managed/split';

  return CompiledContract.make('split', Contract<SplitPrivateState>).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(assetBase)
  ) as any;
};

type ContractCircuits = {
  debt: 'settleDebt';
  split: 'deposit' | 'claim';
};

export const createMidnightProviders = async <PS = SplitPrivateState, Name extends keyof ContractCircuits = 'split'>(connectedAPI: ConnectedAPI, contractName: Name) => {
  const [config, unshielded, shieldedAddresses] = await Promise.all([
    connectedAPI.getConfiguration(),
    connectedAPI.getUnshieldedAddress().catch(() => null),
    connectedAPI.getShieldedAddresses().catch(() => null),
  ]);

  if (config.networkId !== 'preprod') throw new Error('Select Preprod in your wallet');
  setNetworkId(config.networkId);

  const coinPublicKey = shieldedAddresses?.shieldedCoinPublicKey;
  const encryptionPublicKey = shieldedAddresses?.shieldedEncryptionPublicKey;

  if (!coinPublicKey || !encryptionPublicKey) {
    throw new Error('Failed to configure context: shielded addresses not returned from wallet.');
  }

  let accountAddress = 'whisper-split-default-account';
  if (unshielded) {
    accountAddress = typeof unshielded === 'string' ? unshielded : unshielded?.unshieldedAddress || accountAddress;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const zkConfigProvider = new FetchZkConfigProvider<ContractCircuits[Name]>(
    `${origin}/managed/${contractName}`,
    fetch.bind(window)
  );

  const proofServerUri = config.proverServerUri;
  const indexerUri = config.indexerUri;
  const indexerWsUri = config.indexerWsUri;
  if (!indexerUri || !indexerWsUri) throw new Error('Wallet indexer configuration is missing');

  const privateStateProvider = createMemoryPrivateStateProvider<PS>();

  const publicDataProvider = createPatchedPublicDataProvider(indexerUri, indexerWsUri);

  const provingProvider = await (connectedAPI as any).getProvingProvider?.(zkConfigProvider);
  if (!provingProvider && !proofServerUri) throw new Error('Configure a trusted proof server in your wallet');
  const proofProvider = provingProvider ? {
    async proveTx(unprovenTx: any) {
      const { CostModel } = await import('@midnight-ntwrk/ledger-v8');
      return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
    },
  } : httpClientProofProvider(proofServerUri!, zkConfigProvider);

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: async (tx: any): Promise<any> => {
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
      console.log('Submitting contract transaction to Midnight network...');
      const serialized = toHex(tx.serialize());
      const result = await connectedAPI.submitTransaction(serialized);
      console.log('Raw submitTransaction result:', result);
      if (typeof result === 'string' && result) return result;
      if ((result as any)?.transactionId) return (result as any).transactionId;
      if ((result as any)?.id) return (result as any).id;
      const txHash = tx.transactionHash();
      if (!txHash) throw new Error('Submission returned without a transaction identifier; check your wallet before retrying');
      console.log('Contract transaction submitted with hash:', txHash);
      return txHash;
    },
  };

  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
    config,
  };
};

/**
 * Deploy Split contract to Midnight Preprod with initial empty or pre-funded root
 */
export const deploySplitContractOnChain = async (
  connectedAPI: ConnectedAPI,
  initialPrivateState: Partial<SplitPrivateState> = {}
) => {
  const providers = await createMidnightProviders(connectedAPI, 'split');
  const compiledContract = getSplitCompiledContract();

  console.log('Deploying Split Contract to Preprod via Midnight.js...');
  const defaultPrivateState: SplitPrivateState = {
    share: initialPrivateState.share ?? 0n,
    salt: initialPrivateState.salt ?? new Uint8Array(32),
    proof: initialPrivateState.proof ?? {
      leaf: new Uint8Array(32),
      path: Array(16).fill({ sibling: { field: 0n }, goes_left: true }),
    },
  };

  const deployTxData = await createUnprovenDeployTx(providers as any, {
    compiledContract,
    args: [],
    privateStateId: 'splitPrivateState',
    initialPrivateState: defaultPrivateState,
  } as any);

  const contractAddress = deployTxData.public.contractAddress;
  console.log('Contract address derived:', contractAddress);

  const txId = await submitTxAsync(providers as any, { unprovenTx: deployTxData.private.unprovenTx } as any);

  await (providers.privateStateProvider as any).setContractAddress?.(contractAddress);
  if ((deployTxData.private as any)?.signingKey) {
    await (providers.privateStateProvider as any).setSigningKey?.(
      contractAddress,
      (deployTxData.private as any).signingKey
    );
  }

  const txHash = requireTransactionId(txId);
  console.log('Contract deployed at:', contractAddress, 'Tx:', txHash);

  return {
    contractAddress,
    txHash,
    deployTxData,
  };
};

/**
 * Initialize / Deposit pool funds into contract custody with Merkle root
 */
export const callDepositCircuit = async (
  connectedAPI: ConnectedAPI,
  contractAddress: string,
  sharesRoot: bigint,
  totalAmount: bigint
) => {
  const providers = await createMidnightProviders(connectedAPI, 'split');
  const compiled = getSplitCompiledContract();

  console.log(`Invoking deposit circuit on ${contractAddress} with root: ${sharesRoot} totalAmount: ${totalAmount}`);
  providers.privateStateProvider.setContractAddress(contractAddress);
  await providers.privateStateProvider.set('splitPrivateState', {
    share: 0n,
    salt: new Uint8Array(32),
    proof: {
      leaf: new Uint8Array(32),
      path: Array(16).fill({ sibling: { field: 0n }, goes_left: true }),
    },
  });

  // NIGHT is always unshielded (no shielded form exists), so deposit escrows real unshielded
  // NIGHT via receiveUnshielded. The wallet's balanceTx step funds this from the depositor's
  // own balance, same as it already does for DUST fees.
  // submitCallTxAsync returns immediately after submission instead of blocking on
  // publicDataProvider.watchForTxData, which hangs on preprod's offset:null indexer bug.
  const { txId } = await submitCallTxAsync(providers as any, {
    contractAddress,
    compiledContract: compiled,
    circuitId: 'deposit',
    privateStateId: 'splitPrivateState',
    args: [totalAmount, sharesRoot],
  } as any);

  const txHash = requireTransactionId(txId);
  return { txHash, blockHeight: null };
};

/**
 * Privately claim allocated share with zero-knowledge proof of Merkle membership
 */
export const callClaimCircuit = async (
  connectedAPI: ConnectedAPI,
  contractAddress: string,
  participantId: Uint8Array,
  recipientAddressBytes: Uint8Array,
  privateShare: bigint,
  privateSalt: Uint8Array,
  merkleProof: {
    leaf: Uint8Array;
    path: Array<{
      sibling: { field: bigint };
      goes_left: boolean;
    }>;
  }
) => {
  const providers = await createMidnightProviders(connectedAPI, 'split');
  const compiled = getSplitCompiledContract();

  console.log(`Executing private claim on ${contractAddress} for participant: ${toHex(participantId)}`);

  // Ensure private state is loaded for the witness queries
  const privateState: SplitPrivateState = {
    share: privateShare,
    salt: privateSalt,
    proof: merkleProof,
  };
  providers.privateStateProvider.setContractAddress(contractAddress);
  await providers.privateStateProvider.set('splitPrivateState', privateState);

  // submitCallTxAsync returns immediately after submission instead of blocking on
  // publicDataProvider.watchForTxData, which hangs on preprod's offset:null indexer bug.
  const { txId } = await submitCallTxAsync(providers as any, {
    contractAddress,
    compiledContract: compiled,
    circuitId: 'claim',
    privateStateId: 'splitPrivateState',
    args: [participantId, { bytes: recipientAddressBytes }],
  } as any);

  const txHash = requireTransactionId(txId);
  return { txHash, blockHeight: null };
};

/**
 * Derives the raw 32-byte identity Compact's UserAddress expects from the Bech32m
 * unshielded address string (e.g. "mn_addr_preprod1...") the dapp-connector API returns
 * from getUnshieldedAddress(). NIGHT payouts are always unshielded, so claim's recipient
 * is this address, not a shielded coin public key.
 */
export function deriveUnshieldedIdentity(unshieldedAddress: string): Uint8Array {
  const parsed = MidnightBech32m.parse(unshieldedAddress);
  const addr = UnshieldedAddress.codec.decode(parsed.network, parsed);
  return new Uint8Array(addr.data);
}

function requireTransactionId(value: unknown): string {
  if (typeof value !== 'string' || !/^(0x)?[0-9a-f]{64}$/i.test(value)) {
    throw new Error('No valid transaction identifier returned. Check wallet activity before retrying.');
  }
  return value;
}

export { ledger };
