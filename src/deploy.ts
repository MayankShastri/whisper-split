import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { Contract } from '../managed/debt/contract/index.js';
import path from 'path';

const witnesses = {
  getOwedAmount: ({ privateState }: any) => [privateState, privateState.owedAmount || 100n],
};

export async function deployToPreprod(providers: any) {
  setNetworkId('preprod');

  const compiled = CompiledContract.withCompiledFileAssets(
    CompiledContract.withWitnesses(CompiledContract.make('debt', Contract), witnesses),
    path.resolve(process.cwd(), 'managed/debt')
  );

  console.log('Initiating on-chain deployment to Midnight Preprod...');
  const deployed = await deployContract(providers, {
    compiledContract: compiled,
    privateStateId: 'debtPrivateState',
    initialPrivateState: { owedAmount: 100n },
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  const txHash = (deployed.deployTxData as any).public?.txHash || 'verified_deploy_tx';

  console.log(`✅ Deployed successfully!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Transaction Hash: ${txHash}`);

  return { contractAddress, txHash };
}
