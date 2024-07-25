import path from 'path'
import { cwd } from 'process'
import { readFileSync } from 'fs'
import { task } from 'hardhat/config'

import {
  deployMastercopy,
  EIP1193Provider,
  MastercopyArtifact,
} from 'zodiac-core'

import createEIP1193 from './createEIP1193'

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
