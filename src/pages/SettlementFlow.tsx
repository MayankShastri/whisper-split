import React, { useRef, useState } from 'react';
import { useMidnight } from '../hooks/useMidnight';
import { useContractState } from '../hooks/useContractState';
import { callDepositCircuit, callClaimCircuit, deploySplitContractOnChain, deriveUnshieldedIdentity, toHex } from '../midnightProviders';
import { buildMerkleTreeFromAllocations, exportClaimVouchersJson, parseParticipantPackage } from '../merkle';
import { rowsToAllocations } from '../allocations';
import { AllocationBuilder } from '../components/AllocationBuilder';
import { describeTxError } from '../txError';

type Props = { onBackToLanding: () => void; onOpenWalletModal?: () => void };
type Tree = ReturnType<typeof buildMerkleTreeFromAllocations>;
type Voucher = ReturnType<typeof parseParticipantPackage>;

export const SettlementFlow: React.FC<Props> = ({ onBackToLanding, onOpenWalletModal }) => {
  const { isConnected, getConnectedApi } = useMidnight();
  const [contractAddress, setContractAddress] = useState('');
  const [tab, setTab] = useState<'deposit' | 'claim'>('deposit');
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [allocationCount, setAllocationCount] = useState(0);
  const [voucherReady, setVoucherReady] = useState(false);
  const tree = useRef<Tree | null>(null);
  const voucher = useRef<Voucher | null>(null);
  const [myIdentityHex, setMyIdentityHex] = useState<string | null>(null);
  // One contract hosts many pools: deposit targets the applied allocations' pool, claim the voucher's pool.
  const [depositPoolHex, setDepositPoolHex] = useState('');
  const [claimPoolHex, setClaimPoolHex] = useState('');
  const poolIdHex = tab === 'deposit' ? depositPoolHex : claimPoolHex;
  const { contractState, loading, error: stateError, refetch, isClaimed } = useContractState(contractAddress, poolIdHex);
  const validAddress = /^[0-9a-f]{64}$/i.test(contractAddress);
  // Claim pre-check from public ledger state; the private share is compared locally, never rendered.
  const claimBlock = !voucherReady || !contractState || !voucher.current ? null
    : !contractState.poolExists ? 'Pool does not exist on this contract yet.'
    : isClaimed(voucher.current.participantIdBytes) ? 'This voucher has already been claimed.'
    : contractState.depositAmount < voucher.current.share ? 'Pool balance is too low for this voucher.'
    : null;
  const button = 'border border-accent px-4 py-3 text-xs uppercase disabled:opacity-40';
  const panel = 'p-6 md:p-8 border border-[#F5F1E8]/15 bg-[#0C0C0E]/90 space-y-5';

  const execute = async (kind: 'deploy' | 'deposit' | 'claim') => {
    const api = getConnectedApi();
    if (!api) { onOpenWalletModal?.(); return; }
    if (operation.current) return;
    if (kind === 'deploy' && contractState && contractState.depositAmount > 0n
      && !window.confirm(`The selected pool still holds ${contractState.depositAmount} unclaimed base units. One contract can host many pools, so a fresh deploy is usually unnecessary — new allocations get their own pool on this contract. Deploying does not move these funds; they stay claimable only via this contract address, so save it before continuing. Continue?`)) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    setTxHash(null);
    setMessage('Preparing proof and requesting wallet approval. Check your wallet for progress.');
    try {
      if (kind === 'deploy') {
        const result = await deploySplitContractOnChain(api);
        if (api !== getConnectedApi()) return;
        setContractAddress(result.contractAddress);
        setTxHash(result.txHash);
        setMessage('Deployment submitted. Refresh the pool ledger to check indexing; submission alone is not confirmation.');
      } else {
        if (!validAddress) throw new Error('Address required');
        const result = kind === 'deposit'
          ? await (() => {
              if (!tree.current) throw new Error('Allocations required');
              return callDepositCircuit(api, contractAddress, tree.current.poolId, tree.current.rootDigest, tree.current.tree.totalDeposit);
            })()
          : await (async () => {
              const input = voucher.current;
              if (!input || input.contractAddress !== contractAddress) throw new Error('Matching voucher required');
              const { unshieldedAddress } = await api.getUnshieldedAddress();
              const recipientAddressBytes = deriveUnshieldedIdentity(unshieldedAddress);
              return callClaimCircuit(api, contractAddress, input.poolIdBytes, input.participantIdBytes, recipientAddressBytes, input.share, input.saltBytes, input.proof);
            })();
        if (api !== getConnectedApi()) return;
        setTxHash(result.txHash);
        setMessage('Contract call returned. Refresh the pool ledger and inspect the transaction before treating it as settled.');
        await refetch();
      }
    } catch (e) {
      console.error(`${kind} failed:`, e);
      if (api === getConnectedApi()) {
        setMessage(null);
        setError(describeTxError(e, 'Operation did not complete. Check wallet activity, proof assets, contract address and indexer before retrying; a transaction may already have been submitted.'));
      }
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };

  // Shared by the builder and the file import: same validation, same tree build.
  const applyAllocations = async (getRows: () => Promise<unknown> | unknown, source: string) => {
    tree.current = null;
    setAllocationCount(0);
    setDepositPoolHex('');
    setError(null);
    try {
      const allocations = rowsToAllocations(await getRows());
      tree.current = buildMerkleTreeFromAllocations(allocations);
      setAllocationCount(allocations.length);
      setDepositPoolHex(toHex(tree.current.poolId));
      setMessage('Allocations loaded in private memory. Salts generated client-side. Values are not displayed.');
    } catch (e: any) {
      console.error('Failed to load allocations:', e);
      setError(`${source} rejected: ${e?.message || 'Invalid format'}. Use unique 32-byte hex participantAddress values and positive Uint64 shareAmount strings.`);
    }
  };

  const loadAllocations = async (file?: File) => {
    if (!file) return;
    await applyAllocations(async () => {
      if (file.size > 1_000_000) throw new Error('File too large');
      return JSON.parse(await file.text());
    }, 'Allocation file');
  };

  const loadVoucher = async (file?: File) => {
    if (!file) return;
    voucher.current = null;
    setVoucherReady(false);
    setClaimPoolHex('');
    setError(null);
    try {
      if (file.size > 1_000_000) throw new Error('File too large');
      const text = await file.text();
      const data = JSON.parse(text);
      let parsed: Voucher;
      if (Array.isArray(data.vouchers)) {
        if (data.vouchers.length !== 1) throw new Error('Single voucher required');
        const item = data.vouchers[0];
        parsed = parseParticipantPackage(JSON.stringify({
          contractAddress: data.contractAddress,
          poolIdHex: data.poolIdHex,
          participantIdHex: item.participantAddress,
          share: item.shareAmount,
          saltHex: item.saltHex,
          proof: item.merkleProof,
        }));
      } else {
        parsed = parseParticipantPackage(text);
      }
      if (parsed.contractAddress !== contractAddress) throw new Error('Wrong contract');
      voucher.current = parsed;
      setVoucherReady(true);
      setClaimPoolHex(toHex(parsed.poolIdBytes));
      setMessage('Claim voucher loaded in private memory. No private values are displayed.');
    } catch {
      setError('Voucher rejected. Import one valid participant package for the selected contract, including its full Merkle path.');
    }
  };

  const downloadVouchers = () => {
    if (!tree.current || !validAddress) return;
    for (const item of tree.current.vouchers) {
      const blob = new Blob([exportClaimVouchersJson([item], contractAddress, tree.current.poolId)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `claim-voucher-${tree.current.vouchers.indexOf(item) + 1}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    setMessage('Voucher downloads requested. These files contain private credentials; distribute each only to its intended recipient. Your browser may require permission for multiple downloads.');
  };

  const revealMyIdentity = async () => {
    const api = getConnectedApi();
    if (!api) { onOpenWalletModal?.(); return; }
    setError(null);
    try {
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      console.log('getUnshieldedAddress() result:', unshieldedAddress);
      setMyIdentityHex(toHex(deriveUnshieldedIdentity(unshieldedAddress)));
    } catch (e) {
      console.error('revealMyIdentity failed:', e);
      setError('Could not read your unshielded address from the wallet.');
    }
  };

  return <div className="w-full max-w-4xl mx-auto space-y-6 font-mono">
    <div className="border-b border-[#F5F1E8]/10 pb-6 space-y-4">
      <p className="text-xs text-accent uppercase tracking-widest">Confidential Payroll Console</p>
      <h1 className="text-3xl font-light font-serif">Shielded Pool Operations</h1>
      <nav aria-label="Payroll operations" className="flex flex-wrap gap-2">
        {(['deposit', 'claim'] as const).map(value => <button key={value} aria-pressed={tab === value} disabled={busy} onClick={() => setTab(value)} className={button}>{value === 'deposit' ? 'Deposit & Allocate' : 'Claim Share (ZK)'}</button>)}
      </nav>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-y border-[#F5F1E8]/10 py-4">
      <div>Pool custody<div className="text-accent mt-2">{contractState ? contractState.depositAmount.toString() + ' base units' : 'Unknown'}</div></div>
      <div>Claims settled<div className="text-accent mt-2">{contractState?.distributionCount.toString() ?? 'Unknown'}</div></div>
      <div>Network<div className="mt-2">{isConnected ? 'Preprod (wallet)' : 'Not connected'}</div></div>
      <div>Indexer<div className="mt-2">{loading ? 'Loading…' : contractState ? 'State loaded' : 'Not verified'}</div></div>
    </div>
    <div className="space-y-2 text-xs border-b border-[#F5F1E8]/10 pb-4">
      <p className="break-all">Selected pool: {poolIdHex || 'None (apply allocations or load a voucher)'}</p>
      <p className="break-all">Pool Merkle root: {contractState ? (contractState.poolExists ? contractState.sharesRootHex : 'Pool not initialized') : 'Unknown'}</p>
      <p className="text-[#F5F1E8]/70">Claim amounts may be inferred from public pool-balance changes. Witness privacy is not a guarantee of salary confidentiality.</p>
      <button className={button} disabled={busy || loading || !validAddress} onClick={() => void refetch()}>Sync indexer</button>
    </div>
    <section className={panel}>
      <label htmlFor="payroll-contract" className="block text-xs">Public payroll contract address</label>
      <input id="payroll-contract" value={contractAddress} disabled={busy} onChange={event => {
        setContractAddress(event.target.value.trim().replace(/^0x/, ''));
        voucher.current = null;
        setVoucherReady(false);
        setClaimPoolHex('');
        setTxHash(null);
      }} placeholder="64-character contract hex" className="w-full bg-[#0A0A0B] border border-[#F5F1E8]/20 p-3 text-xs" />
      <p className="text-xs text-[#F5F1E8]/70">No deployment address is assumed. Enter your payroll deployment or deploy a fresh pool. Proving uses your wallet or its configured proof server, which must be trusted with private inputs.</p>
      <button className={button} disabled={busy} onClick={() => void execute('deploy')}>Deploy fresh pool contract</button>
    </section>
    <section className={panel}>
      <h2 className="text-xl font-serif">Your Payout Identity</h2>
      <p className="text-xs">The 32-byte identity derived from your connected wallet's unshielded address — NIGHT payouts are always unshielded, so this (not a shielded key) is what claim() pays out to. Use this exact value as a participantAddress (or use "Add my address" below) for any row you intend to claim yourself.</p>
      <button className={button} disabled={busy} onClick={() => void revealMyIdentity()}>Reveal my identity</button>
      {myIdentityHex && <p className="text-xs break-all text-accent">{myIdentityHex}</p>}
    </section>
    {tab === 'deposit' && <section className={panel}>
      <h2 className="text-xl font-serif">Batch Payroll Allocations</h2>
      <p className="text-xs">Enter each recipient and their share. participantAddress must be each recipient's own 32-byte unshielded address (not an arbitrary identity) — claim() checks it against the wallet actually claiming and pays out real NIGHT to it, so it's how funds get routed to the right person. Individual share amounts stay private via Merkle proof; the deposit total, the root, and each claimed amount (once claimed) become public.</p>
      <AllocationBuilder disabled={busy} myAddress={myIdentityHex} onSubmit={rows => void applyAllocations(() => rows, 'Allocations')} />
      <details className="text-xs">
        <summary className="cursor-pointer">Import allocations.json</summary>
        <p className="my-2">An array of objects with participantAddress and shareAmount strings.</p>
        <label htmlFor="payroll-allocations" className="block">Private allocation file</label>
        <input id="payroll-allocations" type="file" accept="application/json,.json" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void loadAllocations(file); }} />
      </details>
      <p role="status" className="text-xs">{allocationCount ? `${allocationCount} allocations loaded` : 'No allocations loaded'}</p>
      {depositPoolHex && <p className="text-xs break-all">Pool ID (new, random): <span className="text-accent">{depositPoolHex}</span></p>}
      {contractState?.poolExists && <p role="status" className="text-xs text-accent">This pool is funded on-chain. Download and distribute the vouchers; to run another payroll on this contract, apply new allocations (a new pool ID is generated).</p>}
      {validAddress && !contractState && <p className="text-xs text-[#F5F1E8]/70">Waiting for the indexer to confirm this contract address (a few seconds after a fresh deploy). Click "Sync indexer" above once it's ready — deposit stays disabled until then.</p>}
      <div className="flex flex-wrap gap-4">
        <button className={button} disabled={busy || !allocationCount || !validAddress || !contractState || contractState.poolExists} onClick={() => void execute('deposit')}>Deposit & publish root</button>
        <button className={button} disabled={busy || !allocationCount || !validAddress} onClick={downloadVouchers}>Download private claim vouchers</button>
      </div>
    </section>}
    {tab === 'claim' && <section className={panel}>
      <h2 className="text-xl font-serif">Claim Private Allocation</h2>
      <p className="text-xs">Import your individual voucher. The share, salt and proof remain in memory, not form fields or rendered output.</p>
      <label htmlFor="payroll-voucher" className="block text-xs">Private claim voucher file</label>
      <input id="payroll-voucher" type="file" accept="application/json,.json" disabled={busy || !validAddress} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void loadVoucher(file); }} />
      <p role="status" className="text-xs">{voucherReady ? 'Voucher ready' : 'No voucher loaded'}</p>
      {claimPoolHex && <p className="text-xs break-all">Voucher pool ID: <span className="text-accent">{claimPoolHex}</span></p>}
      {voucherReady && contractState && voucher.current && <ul className="text-xs space-y-1">
        <li>Pool exists: <span className="text-accent">{contractState.poolExists ? 'Yes' : 'No'}</span></li>
        <li>Pool remaining balance: <span className="text-accent">{contractState.depositAmount.toString()} base units</span></li>
        <li>Claims so far: <span className="text-accent">{contractState.distributionCount.toString()}</span></li>
        <li>This voucher: <span className="text-accent">{isClaimed(voucher.current.participantIdBytes) ? 'Already claimed' : 'Not yet claimed'}</span></li>
      </ul>}
      {claimBlock && <p role="status" className="text-xs text-red-400">{claimBlock}</p>}
      <button className={button} disabled={busy || !voucherReady || !validAddress || !!claimBlock} onClick={() => void execute('claim')}>Generate proof & claim payout</button>
    </section>}
    {message && <p role="status" className="text-sm text-accent">{message}</p>}
    {(error || stateError) && <p role="alert" className="text-sm text-red-400">{error || stateError}</p>}
    {txHash && <a target="_blank" rel="noreferrer" className="block text-xs text-accent break-all underline" href={`https://preprod.midnightexplorer.com/transactions/${txHash}`}>Returned transaction identifier: {txHash}</a>}
    <button onClick={onBackToLanding} className={button}>Back to overview</button>
    <p className="text-xs text-[#F5F1E8]/60">Leaving this screen, disconnecting, or reloading clears private inputs. Save private vouchers before leaving.</p>
  </div>;
};
