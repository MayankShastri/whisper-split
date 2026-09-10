import { describe, it, expect } from 'vitest';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger } from '../managed/debt/contract/index.js';

const COIN = '0'.repeat(64);
const ADDR = RT.sampleContractAddress();

const witnesses = {
  getOwedAmount: ({ privateState }) => [privateState, privateState.owedAmount],
};

const setup = async (owedAmount = 100n) => {
  const contract = new Contract(witnesses);
  const privateState = { owedAmount };
  const initialZswapLocalState = RT.emptyZswapLocalState(COIN);

  const ctor = await contract.initialState({
    initialPrivateState: privateState,
    initialZswapLocalState,
  });

  const ctx = RT.createCircuitContext(
    'settleDebt',
    ADDR,
    initialZswapLocalState,
    ctor.currentContractState,
    ctor.currentPrivateState
  );

  return { contract, ctx, ctor };
};

const getState = (ctx) => ledger(ctx.callContext.currentQueryContext.state);

describe('Whisper Split - Debt Contract', () => {
  it('1. Initializes contract with settled=false and settlementCount=0', async () => {
    const { ctx } = await setup();
    const state = getState(ctx);
    expect(state.settled).toBe(false);
    expect(state.settlementCount).toBe(0n);
  });

  it('2. Successfully settles debt when paidAmount equals owedAmount', async () => {
    const { contract, ctx } = await setup(100n);

    const result = await contract.impureCircuits.settleDebt(ctx, 100n);

    const state = getState(result.context);
    expect(state.settled).toBe(true);
    expect(state.settlementCount).toBe(1n);
  });

  it('3. Fails to settle debt when paidAmount does NOT match owedAmount', async () => {
    const { contract, ctx } = await setup(100n);

    await expect(contract.impureCircuits.settleDebt(ctx, 50n)).rejects.toThrow(
      'Paid amount does not match owed amount'
    );
  });

  it('4. Double-settle is rejected — debt can only be settled once', async () => {
    const { contract, ctx } = await setup(100n);

    const result = await contract.impureCircuits.settleDebt(ctx, 100n);

    await expect(
      contract.impureCircuits.settleDebt(result.context, 100n)
    ).rejects.toThrow('Debt is already settled');
  });

  it('5. Disclose check: ledger state never contains owedAmount or paidAmount', async () => {
    const { contract, ctx } = await setup(100n);

    const result = await contract.impureCircuits.settleDebt(ctx, 100n);
    const state = getState(result.context);

    expect(Object.keys(state)).toEqual(['settled', 'settlementCount']);
    expect((state as any).owedAmount).toBeUndefined();
    expect((state as any).paidAmount).toBeUndefined();
  });
});
