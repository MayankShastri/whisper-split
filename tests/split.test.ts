import { describe, it, expect } from 'vitest';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, type Witnesses } from '../managed/split/contract/index.js';

const COIN = '0'.repeat(64);
const ADDR = RT.sampleContractAddress();

type MerkleProof = ReturnType<Witnesses<unknown>['getMerkleProof']>[1];
type SplitPrivateState = {
  share: bigint;
  salt: Uint8Array;
  proof: MerkleProof;
};

const witnesses: Witnesses<SplitPrivateState> = {
  getMyShare: ({ privateState }) => [privateState, privateState.share],
  getMySecretSalt: ({ privateState }) => [privateState, privateState.salt],
  getMerkleProof: ({ privateState }) => [privateState, privateState.proof],
};

const recipientOf = (participantId: Uint8Array) => ({ bytes: participantId });

const setup = async (
  share = 100n,
  participantId = new Uint8Array(32).fill(2),
  salt = new Uint8Array(32).fill(1)
) => {
  const contract = new Contract<SplitPrivateState>(witnesses);
  const helpers = contract as Contract<SplitPrivateState> & {
    _computeLeaf_0(participantId: Uint8Array, share: bigint, salt: Uint8Array): Uint8Array;
    _merkleTreePathRoot_0(proof: MerkleProof): { field: bigint };
  };

  // Compute valid leaf matching participantId, share, salt
  const leaf = helpers._computeLeaf_0(participantId, share, salt);
  const path: MerkleProof['path'] = Array.from({ length: 16 }, () => ({
    sibling: { field: 0n },
    goes_left: true,
  }));
  const proof: MerkleProof = { leaf, path };

  // Compute valid root matching the Merkle proof
  const expectedRoot = helpers._merkleTreePathRoot_0(proof).field;

  const privateState: SplitPrivateState = { share, salt, proof };
  const initialZswapLocalState = RT.emptyZswapLocalState(COIN);

  const ctor = await contract.initialState({
    initialPrivateState: privateState,
    initialZswapLocalState,
  });

  const ctx: RT.CircuitContext<SplitPrivateState> = RT.createCircuitContext(
    ADDR,
    initialZswapLocalState,
    ctor.currentContractState.data,
    ctor.currentPrivateState
  );

  return { contract, ctx, expectedRoot, participantId, share, salt };
};

const getState = (ctx: RT.CircuitContext<SplitPrivateState>) => ledger(ctx.currentQueryContext.state);

describe('Whisper Split — Level 3 Payroll', () => {
  it('1. Circuit logic: deposit and claim', async () => {
    const share = 100n;
    const totalDeposit = 200n;
    const participantId = new Uint8Array(32).fill(2);

    const { contract, ctx, expectedRoot } = await setup(share, participantId);

    // Deposit
    const depositResult = await contract.impureCircuits.deposit(ctx, totalDeposit, expectedRoot);
    const stateAfterDeposit = getState(depositResult.context);
    expect(stateAfterDeposit.depositAmount).toBe(totalDeposit);
    expect(stateAfterDeposit.sharesRoot).toBe(expectedRoot);

    // Claim
    const claimResult = await contract.impureCircuits.claim(depositResult.context, participantId, recipientOf(participantId));

    const stateAfterClaim = getState(claimResult.context);
    expect(stateAfterClaim.distributionCount).toBe(1n);
    expect(stateAfterClaim.claimed.lookup(participantId)).toBe(true);
  });

  it('2. State transitions: ensure balances and root updates', async () => {
    const share = 50n;
    const initialDeposit = 100n;
    const participantId = new Uint8Array(32).fill(3);

    const { contract, ctx, expectedRoot } = await setup(share, participantId);

    // Deposit
    const depositResult = await contract.impureCircuits.deposit(ctx, initialDeposit, expectedRoot);
    let state = getState(depositResult.context);
    expect(state.sharesRoot).toBe(expectedRoot);
    expect(state.depositAmount).toBe(initialDeposit);

    // Claim
    const claimResult = await contract.impureCircuits.claim(depositResult.context, participantId, recipientOf(participantId));

    state = getState(claimResult.context);
    expect(state.depositAmount).toBe(initialDeposit - share); // 100n - 50n = 50n
    expect(state.distributionCount).toBe(1n);
  });

  it('3. Privacy: ensure private witness data is not in ledger state', async () => {
    const share = 100n;
    const participantId = new Uint8Array(32).fill(4);

    const { contract, ctx, expectedRoot } = await setup(share, participantId);

    const depositResult = await contract.impureCircuits.deposit(ctx, 100n, expectedRoot);
    const claimResult = await contract.impureCircuits.claim(depositResult.context, participantId, recipientOf(participantId));

    const state = getState(claimResult.context);

    // Ledger only contains public state fields
    expect(Object.keys(state)).toEqual(['sharesRoot', 'depositAmount', 'distributionCount', 'claimed']);

    // Explicitly check that private witness data is not present in public ledger state
    expect((state as any).share).toBeUndefined();
    expect((state as any).salt).toBeUndefined();
    expect((state as any).proof).toBeUndefined();
  });

  it('4. Rejection logic: double claim is rejected', async () => {
    const share = 50n;
    const initialDeposit = 200n;
    const participantId = new Uint8Array(32).fill(5);

    const { contract, ctx, expectedRoot } = await setup(share, participantId);

    const depositResult = await contract.impureCircuits.deposit(ctx, initialDeposit, expectedRoot);
    const claimResult = await contract.impureCircuits.claim(depositResult.context, participantId, recipientOf(participantId));

    // Attempting to claim again with the same participantId should fail
    expect(() =>
      contract.impureCircuits.claim(claimResult.context, participantId, recipientOf(participantId))
    ).toThrow('Share already claimed');
  });

  it('5. Rejection logic: insufficient pooled funds in contract is rejected', async () => {
    const share = 250n;
    const initialDeposit = 100n; // Less than share
    const participantId = new Uint8Array(32).fill(6);

    const { contract, ctx, expectedRoot } = await setup(share, participantId);

    const depositResult = await contract.impureCircuits.deposit(ctx, initialDeposit, expectedRoot);

    expect(() =>
      contract.impureCircuits.claim(depositResult.context, participantId, recipientOf(participantId))
    ).toThrow('Insufficient pooled funds in contract');
  });

  it('6. Rejection logic: recipient must match the claimed identity', async () => {
    const share = 50n;
    const initialDeposit = 100n;
    const participantId = new Uint8Array(32).fill(7);
    const wrongRecipient = new Uint8Array(32).fill(9);

    const { contract, ctx, expectedRoot } = await setup(share, participantId);

    const depositResult = await contract.impureCircuits.deposit(ctx, initialDeposit, expectedRoot);

    expect(() =>
      contract.impureCircuits.claim(depositResult.context, participantId, recipientOf(wrongRecipient))
    ).toThrow('Recipient must match claimed identity');
  });
});
