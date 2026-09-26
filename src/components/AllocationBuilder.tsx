import React, { useState } from 'react';
import { addressKey, rowError, type AllocationRow } from '../allocations';

type Props = { disabled?: boolean; myAddress?: string | null; onSubmit: (rows: AllocationRow[]) => void };

const blank = (): AllocationRow => ({ participantAddress: '', shareAmount: '' });
const input = 'bg-[#0A0A0B] border border-[#F5F1E8]/20 p-3 text-xs';
const button = 'border border-accent px-4 py-3 text-xs uppercase disabled:opacity-40';

/** Guided entry for allocations; validation is the same rowError/rowsToAllocations path as file import. */
export const AllocationBuilder: React.FC<Props> = ({ disabled, myAddress, onSubmit }) => {
  const [rows, setRows] = useState<AllocationRow[]>([blank()]);
  const update = (index: number, patch: Partial<AllocationRow>) => setRows(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  const keys = rows.map(row => addressKey(row.participantAddress));
  const errors = rows.map((row, i) => rowError(row) ?? (keys.indexOf(keys[i]) !== i ? 'Duplicate identity' : null));
  const total = rows.reduce((sum, row, i) => errors[i] ? sum : sum + BigInt(row.shareAmount), 0n);
  const invalid = !rows.length || rows.length > 256 || errors.some(Boolean);

  return <div className="space-y-3">
    {rows.map((row, i) => <div key={i} className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <input aria-label={`Participant ${i + 1} unshielded address`} value={row.participantAddress} disabled={disabled} onChange={event => update(i, { participantAddress: event.target.value.trim() })} placeholder="64-character address hex" className={`${input} flex-1 min-w-0`} />
        <input aria-label={`Participant ${i + 1} share`} value={row.shareAmount} disabled={disabled} inputMode="numeric" onChange={event => update(i, { shareAmount: event.target.value.trim() })} placeholder="Share (base units)" className={`${input} w-40`} />
        <button className={button} disabled={disabled} onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button>
      </div>
      {errors[i] && (row.participantAddress || row.shareAmount) && <p className="text-xs text-red-400">{errors[i]}</p>}
    </div>)}
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={disabled || rows.length >= 256} onClick={() => setRows([...rows, blank()])}>Add participant</button>
      {myAddress && <button className={button} disabled={disabled || keys.includes(addressKey(myAddress))} onClick={() => setRows([...rows.filter(row => row.participantAddress || row.shareAmount), { participantAddress: myAddress, shareAmount: '' }])}>Add my address</button>}
    </div>
    <p className="text-xs">Running total (valid rows): <span className="text-accent">{total.toString()} base units</span></p>
    <button className={button} disabled={disabled || invalid} onClick={() => onSubmit(rows)}>Use these allocations</button>
  </div>;
};
