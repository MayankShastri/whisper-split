import { describe, it, expect } from 'vitest';
import { rowsToAllocations } from '../src/allocations';
import { buildMerkleTreeFromAllocations, computeProofRoot, exportClaimVouchersJson, parseParticipantPackage } from '../src/merkle';
import { toHex } from '../src/midnightProviders';

const A = 'aa'.repeat(32);
const B = 'bb'.repeat(32);
const CONTRACT = 'cc'.repeat(32);

// Mirrors SettlementFlow.loadVoucher's reshaping of an exported voucher file.
const loadVoucher = (text: string) => {
  const data = JSON.parse(text);
  const item = data.vouchers[0];
  return parseParticipantPackage(JSON.stringify({
    contractAddress: data.contractAddress,
    poolIdHex: data.poolIdHex,
    participantIdHex: item.participantAddress,
    share: item.shareAmount,
    saltHex: item.saltHex,
    proof: item.merkleProof,
  }));
};

const build = () => buildMerkleTreeFromAllocations(rowsToAllocations([{ participantAddress: A, shareAmount: '50' }, { participantAddress: B, shareAmount: '30' }]));

describe('claim vouchers', () => {
  it('round-trips every exported voucher and proves to the tree root', () => {
    const tree = build();
    for (const item of tree.vouchers) {
      const parsed = loadVoucher(exportClaimVouchersJson([item], CONTRACT, tree.poolId));
      expect(parsed.contractAddress).toBe(CONTRACT);
      expect(parsed.poolIdBytes).toEqual(tree.poolId);
      expect(toHex(parsed.participantIdBytes)).toBe(item.participantAddress);
      expect(parsed.share.toString()).toBe(item.shareAmount);
      expect(toHex(parsed.saltBytes)).toBe(item.saltHex);
      expect(computeProofRoot(parsed.proof)).toBe(tree.rootDigest);
    }
  });

  it('gives each tree build a fresh poolId', () => {
    expect(toHex(build().poolId)).not.toBe(toHex(build().poolId));
  });

  it('rejects a voucher without poolIdHex (Level 3 format)', () => {
    const tree = build();
    const data = JSON.parse(exportClaimVouchersJson([tree.vouchers[0]], CONTRACT, tree.poolId));
    delete data.poolIdHex;
    expect(() => loadVoucher(JSON.stringify(data))).toThrow('Invalid voucher inputs');
  });

  it('rejects a voucher whose share was tampered with', () => {
    const tree = build();
    const data = JSON.parse(exportClaimVouchersJson([tree.vouchers[0]], CONTRACT, tree.poolId));
    data.vouchers[0].shareAmount = '51';
    expect(() => loadVoucher(JSON.stringify(data))).toThrow('Voucher leaf mismatch');
  });
});
