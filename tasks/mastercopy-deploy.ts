import path from 'path'
import { cwd } from 'process'
import { readFileSync } from 'fs'
import { Signer } from 'ethers'
import { task } from 'hardhat/config'
import { EthereumProvider } from 'hardhat/types'

import {
  deployMastercopy,
  EIP1193Provider,
  MastercopyArtifact,
} from 'zodiac-core'

task(
  'mastercopy:deploy',
  'For every version entry on the artifacts file, deploys a mastercopy into the current network'
).setAction(async (_, hre) => {
  const [signer] = await hre.ethers.getSigners()
  const provider = createEIP1193(hre.network.provider, signer)

  const mastercopies = JSON.parse(
    readFileSync(path.join(cwd(), 'mastercopies.json'), 'utf8')
  )

  for (const [version, artifact] of Object.entries(mastercopies)) {
    await deploy(version, artifact as MastercopyArtifact, provider)
  }
})

async function deploy(
  version: string,
  artifact: MastercopyArtifact,
  provider: EIP1193Provider
) {
  const { bytecode, constructorArgs, salt } = artifact

  const { address, noop } = await deployMastercopy(
    { bytecode, constructorArgs, salt },
    provider
  )
  if (noop) {
    console.log(`version ${version}: Mastercopy already deployed at ${address}`)
  } else {
    console.log(`version ${version}: Deployed Mastercopy at at ${address}`)
  }
}

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
