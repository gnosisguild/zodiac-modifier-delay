import { Signer } from 'ethers'
import { task } from 'hardhat/config'
import { EthereumProvider } from 'hardhat/types'

import { EIP1193Provider, deployMastercopiesFromArtifact } from '@gnosis-guild/zodiac-core'

task(
  'mastercopy:deploy',
  'For every version entry on the artifacts file, deploys a mastercopy into the current network'
).setAction(async (_, hre) => {
  const [signer] = await hre.ethers.getSigners()
  await deployMastercopiesFromArtifact({
    provider: createEIP1193(hre.network.provider, signer),
  })
})

function createEIP1193(
  provider: EthereumProvider,
  signer: Signer
): EIP1193Provider {
  return {
    request: async ({ method, params }) => {
      if (method == 'eth_sendTransaction') {
        const { hash } = await signer.sendTransaction((params as any[])[0])
        return hash
      }

      return provider.request({ method, params })
    },
  }
}
