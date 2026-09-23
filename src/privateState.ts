import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

export function createMemoryPrivateStateProvider<PS>(): PrivateStateProvider<string, PS> {
  let address = '';
  const states = new Map<string, PS>();
  const keys = new Map<string, Parameters<PrivateStateProvider['setSigningKey']>[1]>();
  const key = (id: string) => {
    if (!address) throw new Error('Contract scope is required');
    return `${address}:${id}`;
  };
  const unavailable = async (): Promise<never> => { throw new Error('Private data export/import is disabled for this in-memory session'); };
  return {
    setContractAddress(value) { address = value; },
    async set(id, state) { states.set(key(id), state); },
    async get(id) { return states.get(key(id)) ?? null; },
    async remove(id) { states.delete(key(id)); },
    async clear() { states.clear(); },
    async setSigningKey(id, value) { keys.set(id, value); },
    async getSigningKey(id) { return keys.get(id) ?? null; },
    async removeSigningKey(id) { keys.delete(id); },
    async clearSigningKeys() { keys.clear(); },
    exportPrivateStates: unavailable,
    importPrivateStates: unavailable,
    exportSigningKeys: unavailable,
    importSigningKeys: unavailable,
  };
}
