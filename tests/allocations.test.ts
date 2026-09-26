import { describe, it, expect } from 'vitest';
import { rowsToAllocations, rowError } from '../src/allocations';
import { buildMerkleTreeFromAllocations } from '../src/merkle';

const A = 'aa'.repeat(32);
const B = 'bb'.repeat(32);

describe('rowsToAllocations', () => {
  it('turns valid rows into ParticipantAllocation[] with fresh salts', () => {
    const allocations = rowsToAllocations([{ participantAddress: A, shareAmount: '50' }, { participantAddress: `0x${B}`, shareAmount: '30' }]);
    expect(allocations.map(({ id, participantAddress, shareAmount }) => ({ id, participantAddress, shareAmount }))).toEqual([
      { id: '0', participantAddress: A, shareAmount: 50n },
      { id: '1', participantAddress: `0x${B}`, shareAmount: 30n },
    ]);
    allocations.forEach(a => expect(a.salt).toHaveLength(32));
    expect(buildMerkleTreeFromAllocations(allocations).tree.totalDeposit).toBe(80n);
  });

  it('rejects invalid addresses', () => {
    expect(() => rowsToAllocations([{ participantAddress: 'abc', shareAmount: '1' }])).toThrow('Invalid identity');
    expect(() => rowsToAllocations([{ participantAddress: A + 'a', shareAmount: '1' }])).toThrow('Invalid identity');
  });

  it('rejects duplicate addresses regardless of 0x prefix or case', () => {
    expect(() => rowsToAllocations([{ participantAddress: A, shareAmount: '1' }, { participantAddress: `0x${A.toUpperCase()}`, shareAmount: '2' }])).toThrow('Duplicate identity');
  });

  it('rejects non-positive, non-integer and oversized shares', () => {
    expect(() => rowsToAllocations([{ participantAddress: A, shareAmount: '0' }])).toThrow('Out of range');
    expect(() => rowsToAllocations([{ participantAddress: A, shareAmount: '-1' }])).toThrow('Invalid share');
    expect(() => rowsToAllocations([{ participantAddress: A, shareAmount: '1.5' }])).toThrow('Invalid share');
    expect(() => rowsToAllocations([{ participantAddress: A, shareAmount: 5 }])).toThrow('Invalid share');
    expect(() => rowsToAllocations([{ participantAddress: A, shareAmount: (2n ** 64n).toString() }])).toThrow('Out of range');
    expect(() => rowsToAllocations([{ participantAddress: A, shareAmount: (2n ** 63n).toString() }, { participantAddress: B, shareAmount: (2n ** 63n).toString() }])).toThrow('Pool too large');
    expect(() => rowsToAllocations([])).toThrow('Invalid rows');
  });

  it('builder rows and an allocations.json file produce identical addresses and shares', () => {
    const builderRows = [{ participantAddress: A, shareAmount: '50' }, { participantAddress: `0x${B}`, shareAmount: '30' }];
    const fileRows = JSON.parse(JSON.stringify(builderRows, null, 2)); // what loadAllocations parses from file.text()
    const pick = (rows: unknown) => rowsToAllocations(rows).map(({ participantAddress, shareAmount }) => ({ participantAddress, shareAmount }));
    expect(pick(builderRows)).toEqual(pick(fileRows));
    builderRows.forEach(row => expect(rowError(row)).toBeNull());
  });
});
