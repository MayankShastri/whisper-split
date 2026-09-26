// Contract assert strings (contracts/split.compact, contracts/debt.compact) -> plain-English hints.
const HINTS: [string, string][] = [
  ['Recipient must match claimed identity', 'This voucher belongs to a different wallet account — switch accounts in your wallet.'],
  ['Share already claimed', 'This voucher has already been claimed.'],
  ['Insufficient pooled funds in contract', 'The pool no longer holds enough funds for this share.'],
  ['Pool does not exist', 'This pool has not been funded on this contract yet — check the contract address or wait for the deposit.'],
  ['Pool already initialized', 'This pool is already funded — apply new allocations to create a new pool.'],
  ['Invalid Merkle proof for private share', 'The voucher does not match this pool\'s published root — it may be from a different payroll run.'],
  ['Merkle path leaf mismatch', 'The voucher is corrupted or edited — its share, salt and proof do not match.'],
  ['Deposit amount must be positive', 'The allocations total must be greater than zero.'],
  ['Debt is already settled', 'This debt has already been settled.'],
  ['Paid amount does not match owed amount', 'The paid amount does not match the owed amount.'],
];

export const describeTxError = (e: unknown, generic: string): string => {
  const parts: string[] = [];
  for (let cur: any = e, depth = 0; cur && depth < 5; cur = cur.cause, depth++) {
    parts.push(typeof cur === 'string' ? cur : String(cur.message ?? cur));
  }
  const raw = parts.join(' | ');
  const hit = HINTS.find(([needle]) => raw.includes(needle));
  if (hit) return `${hit[0]}: ${hit[1]}`;
  return raw ? `${generic} Details: ${raw.length > 200 ? raw.slice(0, 200) + '…' : raw}` : generic;
};
