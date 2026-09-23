import { Contract } from '../managed/split/contract/index.js';
import { toHex, fromHex } from './midnightProviders.js';

export type ParticipantEntry = {
  id: string; // display ID or hex
  participantIdBytes: Uint8Array;
  share: bigint;
  saltBytes: Uint8Array;
  leafBytes?: Uint8Array;
  proof?: MerkleProof;
};

export type MerklePathEntry = {
  sibling: { field: bigint };
  goes_left: boolean;
};

export type MerkleProof = {
  leaf: Uint8Array;
  path: MerklePathEntry[];
};

export type SplitTreeResult = {
  root: bigint;
  rootHex: string;
  totalDeposit: bigint;
  participants: ParticipantEntry[];
};

export type ParticipantAllocation = {
  id: string;
  participantAddress: string;
  shareAmount: bigint;
  salt: Uint8Array;
};

export type ClaimVoucher = {
  participantAddress: string;
  shareAmount: string;
  saltHex: string;
  merkleProof: {
    leaf: Uint8Array;
    path: Array<{
      sibling: { field: bigint };
      goes_left: boolean;
    }>;
  };
};

const dummyWitnesses = {
  getMyShare: (ctx: any) => [ctx.privateState, 0n],
  getMySecretSalt: (ctx: any) => [ctx.privateState, new Uint8Array(32)],
  getMerkleProof: (ctx: any) => [ctx.privateState, { leaf: new Uint8Array(32), path: [] }],
};

const contractInstance = new Contract(dummyWitnesses as any);

/**
 * Generate a cryptographically random 32-byte salt
 */
export function generateRandomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Normalizes an address, public key, or string identifier into a 32-byte Uint8Array
 */
export function normalizeParticipantId(input: string): Uint8Array {
  const clean = input.trim().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/i.test(clean)) throw new Error('Participant ID must be exactly 32 bytes of hex');
  return fromHex(clean);
}

/**
 * Compute the leaf hash for a participant: persistentHash([participantId, salt, share as Field as Bytes<32>])
 */
export function computeParticipantLeaf(
  participantId: Uint8Array,
  share: bigint,
  salt: Uint8Array
): Uint8Array {
  return (contractInstance as any)._computeLeaf_0(participantId, share, salt);
}

/**
 * Compute root from a single leaf with empty sibling path (useful for single-recipient splits or test paths)
 */
export function computeProofRoot(proof: MerkleProof): bigint {
  return (contractInstance as any)._merkleTreePathRoot_0(proof).field;
}

/**
 * Build a 16-level Merkle tree over participant allocations
 */
export function buildSplitMerkleTree(
  rawParticipants: Array<{ id: string; share: bigint; salt?: Uint8Array }>
): SplitTreeResult {
  if (rawParticipants.length === 0) {
    throw new Error('At least one participant is required to build a split pool');
  }

  const depth = 16;

  // 1. Process participant entries and compute leaves
  const participants: ParticipantEntry[] = rawParticipants.map((p) => {
    const participantIdBytes = normalizeParticipantId(p.id);
    const saltBytes = p.salt && p.salt.length === 32 ? p.salt : generateRandomSalt();
    const leafBytes = computeParticipantLeaf(participantIdBytes, p.share, saltBytes);
    return {
      id: p.id,
      participantIdBytes,
      share: p.share,
      saltBytes,
      leafBytes,
    };
  });

  // 2. Leaf digests (degrade to transient field)
  const leafDigests: bigint[] = participants.map((p) => {
    return (contractInstance as any)._degradeToTransient_0(
      (contractInstance as any)._persistentHash_1({
        domain_sep: new Uint8Array([109, 100, 110, 58, 108, 104]),
        data: p.leafBytes!,
      })
    );
  });

  const defaultEmptyField = 0n;

  // Build tree levels (level 0 = leaves digests, level 16 = root)
  const levelDefaults: bigint[] = new Array(depth + 1);
  levelDefaults[0] = defaultEmptyField;
  for (let d = 0; d < depth; d++) {
    levelDefaults[d + 1] = (contractInstance as any)._transientHash_0([
      levelDefaults[d],
      levelDefaults[d],
    ]);
  }

  let currentLevel: Map<number, bigint> = new Map();
  for (let i = 0; i < leafDigests.length; i++) {
    currentLevel.set(i, leafDigests[i]);
  }

  const treeLevels: Map<number, bigint>[] = [currentLevel];

  for (let d = 0; d < depth; d++) {
    const nextLevel: Map<number, bigint> = new Map();
    const processedPairs = new Set<number>();

    for (const [idx] of currentLevel.entries()) {
      const pairIdx = Math.floor(idx / 2);
      if (processedPairs.has(pairIdx)) continue;
      processedPairs.add(pairIdx);

      const leftIdx = pairIdx * 2;
      const rightIdx = pairIdx * 2 + 1;

      const leftVal = currentLevel.get(leftIdx) ?? levelDefaults[d];
      const rightVal = currentLevel.get(rightIdx) ?? levelDefaults[d];

      const parentVal = (contractInstance as any)._transientHash_0([leftVal, rightVal]);
      nextLevel.set(pairIdx, parentVal);
    }

    treeLevels.push(nextLevel);
    currentLevel = nextLevel;
  }

  const root = treeLevels[depth].get(0) ?? levelDefaults[depth];

  // 3. Generate Merkle proofs for each participant
  for (let i = 0; i < participants.length; i++) {
    const path: MerklePathEntry[] = [];
    let curIdx = i;

    for (let d = 0; d < depth; d++) {
      const isRight = curIdx % 2 === 1;
      const siblingIdx = isRight ? curIdx - 1 : curIdx + 1;
      const siblingField = treeLevels[d].get(siblingIdx) ?? levelDefaults[d];
      const goes_left = !isRight;

      path.push({
        sibling: { field: siblingField },
        goes_left,
      });

      curIdx = Math.floor(curIdx / 2);
    }

    const proof: MerkleProof = {
      leaf: participants[i].leafBytes!,
      path,
    };

    participants[i].proof = proof;
  }

  const totalDeposit = participants.reduce((acc, p) => acc + p.share, 0n);

  return {
    root,
    rootHex: '0x' + root.toString(16).padStart(64, '0'),
    totalDeposit,
    participants,
  };
}

/**
 * Friendly wrapper for SettlementFlow component
 */
export function buildMerkleTreeFromAllocations(allocations: ParticipantAllocation[]) {
  const tree = buildSplitMerkleTree(
    allocations.map((a) => ({
      id: a.participantAddress,
      share: a.shareAmount,
      salt: a.salt,
    }))
  );

  const vouchers: ClaimVoucher[] = tree.participants.map((p) => ({
    participantAddress: p.id,
    shareAmount: p.share.toString(),
    saltHex: toHex(p.saltBytes),
    merkleProof: p.proof!,
  }));

  return {
    rootDigest: tree.root,
    rootHex: tree.rootHex,
    vouchers,
    tree,
  };
}

export function exportClaimVouchersJson(vouchers: ClaimVoucher[], contractAddress: string): string {
  return JSON.stringify(
    {
      contractAddress,
      generatedAt: new Date().toISOString(),
      vouchers: vouchers.map((v) => ({
        participantAddress: v.participantAddress,
        shareAmount: v.shareAmount,
        saltHex: v.saltHex,
        merkleProof: {
          leafHex: toHex(v.merkleProof.leaf),
          path: v.merkleProof.path.map((p) => ({
            siblingField: p.sibling.field.toString(),
            goes_left: p.goes_left,
          })),
        },
      })),
    },
    null,
    2
  );
}

/**
 * Export participant credentials to JSON
 */
export function exportParticipantPackage(participant: ParticipantEntry, contractAddress: string) {
  return JSON.stringify(
    {
      contractAddress,
      participantId: participant.id,
      participantIdHex: '0x' + toHex(participant.participantIdBytes),
      share: participant.share.toString(),
      saltHex: '0x' + toHex(participant.saltBytes),
      leafHex: participant.leafBytes ? '0x' + toHex(participant.leafBytes) : undefined,
      proof: participant.proof
        ? {
            leafHex: '0x' + toHex(participant.proof.leaf),
            path: participant.proof.path.map((p) => ({
              siblingField: '0x' + p.sibling.field.toString(16).padStart(64, '0'),
              goes_left: p.goes_left,
            })),
          }
        : null,
    },
    null,
    2
  );
}

/**
 * Parse participant credentials from JSON
 */
export function parseParticipantPackage(jsonStr: string): {
  contractAddress?: string;
  participantIdBytes: Uint8Array;
  share: bigint;
  saltBytes: Uint8Array;
  proof: MerkleProof;
} {
  const data = JSON.parse(jsonStr);
  const participantIdBytes = data.participantIdHex
    ? fromHex(data.participantIdHex)
    : normalizeParticipantId(data.participantId || '');
  const share = BigInt(data.share);
  const saltBytes = fromHex(data.saltHex);
  if (participantIdBytes.length !== 32 || saltBytes.length !== 32 || share <= 0n || share >= 2n ** 64n) throw new Error('Invalid voucher inputs');
  if (!Array.isArray(data.proof?.path) || data.proof.path.length !== 16) throw new Error('Invalid Merkle path');

  const proof: MerkleProof = {
    leaf: fromHex(data.proof.leafHex),
    path: data.proof.path.map((p: any) => ({
      sibling: {
        field: BigInt(p.siblingField),
      },
      goes_left: Boolean(p.goes_left),
    })),
  };

  if (proof.leaf.length !== 32 || data.proof.path.some((entry: { goes_left: unknown }) => typeof entry.goes_left !== 'boolean')) throw new Error('Invalid Merkle proof');
  if (toHex(computeParticipantLeaf(participantIdBytes, share, saltBytes)) !== toHex(proof.leaf)) throw new Error('Voucher leaf mismatch');

  return {
    contractAddress: data.contractAddress,
    participantIdBytes,
    share,
    saltBytes,
    proof,
  };
}
