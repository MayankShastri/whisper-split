import { describe, it, expect } from 'vitest';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, type Witnesses } from '../managed/split/contract/index.js';

const COIN = '0'.repeat(64);
const ADDR = RT.sampleContractAddress();

type MerkleProof = ReturnType<Witnesses<unknown>['getMerkleProof']>[1];
type PS = { share: bigint; salt: Uint8Array; proof: MerkleProof };

const witnesses: Witnesses<PS> = {
  getMyShare: ({ privateState }) => [privateState, privateState.share],
  getMySecretSalt: ({ privateState }) => [privateState, privateState.salt],
  getMerkleProof: ({ privateState }) => [privateState, privateState.proof],
};

const contract = new Contract<PS>(witnesses);
const helpers = contract as Contract<PS> & {
  _computeLeaf_0(participantId: Uint8Array, share: bigint, salt: Uint8Array): Uint8Array;
  _computeClaimKey_0(poolId: Uint8Array, participantId: Uint8Array): Uint8Array;
  _merkleTreePathRoot_0(proof: MerkleProof): { field: bigint };
};

const bytes = (n: number) => new Uint8Array(32).fill(n);
const recipientOf = (id: Uint8Array) => ({ bytes: id });

// Single-leaf tree: all-zero siblings.
const allocation = (participantId: Uint8Array, share: bigint, salt: Uint8Array) => {
  const leaf = helpers._computeLeaf_0(participantId, share, salt);
  const proof: MerkleProof = {
    leaf,
    path: Array.from({ length: 16 }, () => ({ sibling: { field: 0n }, goes_left: true })),
  };
  const root = helpers._merkleTreePathRoot_0(proof).field;
  const ps: PS = { share, salt, proof };
  return { ps, root };
};

const fresh = async (ps: PS) => {
  const z = RT.emptyZswapLocalState(COIN);
  const ctor = await contract.initialState({ initialPrivateState: ps, initialZswapLocalState: z });
  return RT.createCircuitContext(ADDR, z, ctor.currentContractState.data, ctor.currentPrivateState);
};
const as = (ctx: RT.CircuitContext<PS>, ps: PS): RT.CircuitContext<PS> => ({ ...ctx, currentPrivateState: ps });
const L = (ctx: RT.CircuitContext<PS>) => ledger(ctx.currentQueryContext.state);
const isClaimed = (ctx: RT.CircuitContext<PS>, pool: Uint8Array, id: Uint8Array) => {
  const k = helpers._computeClaimKey_0(pool, id);
  const c = L(ctx).claimed;
  return c.member(k) && c.lookup(k);
};

const POOL_A = bytes(0xa1);
const POOL_B = bytes(0xb2);
const POOL_X = bytes(0xee); // never deposited

describe('Whisper Split — Level 3 Payroll (multi-pool)', () => {
  it('two pools deposit + claim independently; claim in A leaves B untouched', async () => {
    const alice = bytes(2), bob = bytes(3);
    const a = allocation(alice, 60n, bytes(1));
    const b = allocation(bob, 40n, bytes(4));

    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 100n, a.root).context;
    ctx = contract.impureCircuits.deposit(ctx, POOL_B, 500n, b.root).context;
    expect(L(ctx).poolDepositAmount.lookup(POOL_A)).toBe(100n);
    expect(L(ctx).poolDepositAmount.lookup(POOL_B)).toBe(500n);
    expect(L(ctx).poolSharesRoot.lookup(POOL_A)).toBe(a.root);
    expect(L(ctx).poolSharesRoot.lookup(POOL_B)).toBe(b.root);

    ctx = contract.impureCircuits.claim(as(ctx, a.ps), POOL_A, alice, recipientOf(alice)).context;
    expect(L(ctx).poolDepositAmount.lookup(POOL_A)).toBe(40n);
    expect(L(ctx).poolDistributionCount.lookup(POOL_A)).toBe(1n);
    expect(isClaimed(ctx, POOL_A, alice)).toBe(true);
    // Pool B untouched
    expect(L(ctx).poolDepositAmount.lookup(POOL_B)).toBe(500n);
    expect(L(ctx).poolDistributionCount.lookup(POOL_B)).toBe(0n);
    expect(isClaimed(ctx, POOL_B, bob)).toBe(false);
    expect(isClaimed(ctx, POOL_B, alice)).toBe(false);
    expect(L(ctx).claimed.size()).toBe(1n);

    ctx = contract.impureCircuits.claim(as(ctx, b.ps), POOL_B, bob, recipientOf(bob)).context;
    expect(L(ctx).poolDepositAmount.lookup(POOL_B)).toBe(460n);
    expect(L(ctx).poolDistributionCount.lookup(POOL_B)).toBe(1n);
    expect(L(ctx).poolDepositAmount.lookup(POOL_A)).toBe(40n);
    expect(isClaimed(ctx, POOL_B, bob)).toBe(true);
  });

  it('double claim within a pool is rejected', async () => {
    const id = bytes(5);
    const a = allocation(id, 50n, bytes(1));
    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 200n, a.root).context;
    ctx = contract.impureCircuits.claim(ctx, POOL_A, id, recipientOf(id)).context;
    expect(() => contract.impureCircuits.claim(ctx, POOL_A, id, recipientOf(id))).toThrow('Share already claimed');
  });

  it('same participant can claim in two different pools', async () => {
    const id = bytes(6);
    const a = allocation(id, 30n, bytes(7));
    const b = allocation(id, 70n, bytes(8));
    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 30n, a.root).context;
    ctx = contract.impureCircuits.deposit(ctx, POOL_B, 70n, b.root).context;
    ctx = contract.impureCircuits.claim(as(ctx, a.ps), POOL_A, id, recipientOf(id)).context;
    ctx = contract.impureCircuits.claim(as(ctx, b.ps), POOL_B, id, recipientOf(id)).context;
    expect(isClaimed(ctx, POOL_A, id)).toBe(true);
    expect(isClaimed(ctx, POOL_B, id)).toBe(true);
    expect(L(ctx).poolDepositAmount.lookup(POOL_A)).toBe(0n);
    expect(L(ctx).poolDepositAmount.lookup(POOL_B)).toBe(0n);
    expect(L(ctx).claimed.size()).toBe(2n);
  });

  it('proof for pool A cannot be replayed against pool B', async () => {
    const id = bytes(6);
    const a = allocation(id, 30n, bytes(7));
    const b = allocation(bytes(9), 70n, bytes(8));
    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 30n, a.root).context;
    ctx = contract.impureCircuits.deposit(ctx, POOL_B, 700n, b.root).context;
    expect(() => contract.impureCircuits.claim(as(ctx, a.ps), POOL_B, id, recipientOf(id))).toThrow(
      'Invalid Merkle proof for private share'
    );
  });

  it('claim against a nonexistent pool is rejected', async () => {
    const id = bytes(2);
    const a = allocation(id, 10n, bytes(1));
    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 100n, a.root).context;
    expect(() => contract.impureCircuits.claim(ctx, POOL_X, id, recipientOf(id))).toThrow('Pool does not exist');
  });

  it('re-depositing into an initialized pool is rejected', async () => {
    const a = allocation(bytes(2), 10n, bytes(1));
    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 100n, a.root).context;
    expect(() => contract.impureCircuits.deposit(ctx, POOL_A, 5n, a.root)).toThrow('Pool already initialized');
    expect(() => contract.impureCircuits.deposit(ctx, POOL_B, 0n, a.root)).toThrow('Deposit amount must be positive');
  });

  it('insufficient funds rejected per pool even if another pool is rich', async () => {
    const id = bytes(6);
    const a = allocation(id, 250n, bytes(1));
    const b = allocation(bytes(9), 1n, bytes(2));
    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 100n, a.root).context;
    ctx = contract.impureCircuits.deposit(ctx, POOL_B, 10_000n, b.root).context;
    expect(() => contract.impureCircuits.claim(ctx, POOL_A, id, recipientOf(id))).toThrow(
      'Insufficient pooled funds in contract'
    );
  });

  it('recipient mismatch still rejected', async () => {
    const id = bytes(7);
    const a = allocation(id, 50n, bytes(1));
    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 100n, a.root).context;
    expect(() => contract.impureCircuits.claim(ctx, POOL_A, id, recipientOf(bytes(9)))).toThrow(
      'Recipient must match claimed identity'
    );
  });

  it('claim key depends on both poolId and participantId', () => {
    const k = (p: Uint8Array, i: Uint8Array) => Buffer.from(helpers._computeClaimKey_0(p, i)).toString('hex');
    expect(k(POOL_A, bytes(1))).not.toBe(k(POOL_B, bytes(1)));
    expect(k(POOL_A, bytes(1))).not.toBe(k(POOL_A, bytes(2)));
    expect(k(bytes(1), bytes(2))).not.toBe(k(bytes(2), bytes(1)));
  });

  it('privacy: ledger holds only public per-pool fields, no witness data', async () => {
    const id = bytes(4);
    const a = allocation(id, 100n, bytes(1));
    let ctx = await fresh(a.ps);
    ctx = contract.impureCircuits.deposit(ctx, POOL_A, 100n, a.root).context;
    ctx = contract.impureCircuits.claim(ctx, POOL_A, id, recipientOf(id)).context;
    const state = L(ctx);
    expect(Object.keys(state)).toEqual(['poolSharesRoot', 'poolDepositAmount', 'poolDistributionCount', 'claimed']);
    expect((state as any).share).toBeUndefined();
    expect((state as any).salt).toBeUndefined();
    expect((state as any).proof).toBeUndefined();
    // Claim status is keyed by the domain-separated hash, not the raw participantId.
    expect(state.claimed.member(id)).toBe(false);
  });
});
