import { generateRandomSalt, type ParticipantAllocation } from './merkle';

export type AllocationRow = { participantAddress: string; shareAmount: string };

const MAX_UINT64 = 2n ** 64n;

/** Canonical form used for duplicate detection. */
export const addressKey = (address: string) => address.trim().replace(/^0x/i, '').toLowerCase();

/** Returns an error message for one row, or null if it is valid on its own. */
export function rowError(row: any): string | null {
  if (typeof row?.participantAddress !== 'string' || !/^(0x)?[0-9a-f]{64}$/i.test(row.participantAddress)) return 'Invalid identity';
  if (typeof row.shareAmount !== 'string' || !/^[0-9]+$/.test(row.shareAmount)) return 'Invalid share';
  const shareAmount = BigInt(row.shareAmount);
  if (shareAmount <= 0n || shareAmount >= MAX_UINT64) return 'Out of range';
  return null;
}

/**
 * Single validation path for both the allocation builder and allocations.json import.
 * Throws a descriptive error; salts are generated fresh per call.
 */
export function rowsToAllocations(rows: unknown): ParticipantAllocation[] {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 256) throw new Error('Invalid rows');
  const allocations: ParticipantAllocation[] = rows.map((row, index) => {
    const problem = rowError(row);
    if (problem) throw new Error(problem);
    return { id: String(index), participantAddress: row.participantAddress, shareAmount: BigInt(row.shareAmount), salt: generateRandomSalt() };
  });
  if (new Set(allocations.map(a => addressKey(a.participantAddress))).size !== allocations.length) throw new Error('Duplicate identity');
  if (allocations.reduce((sum, a) => sum + a.shareAmount, 0n) >= MAX_UINT64) throw new Error('Pool too large');
  return allocations;
}
