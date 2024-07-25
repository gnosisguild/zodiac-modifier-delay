import path from 'path'
import { cwd } from 'process'
import { readFileSync } from 'fs'
import { task } from 'hardhat/config'

import {
  verifyMastercopy,
  MastercopyArtifact,
  EIP1193Provider,
} from 'zodiac-core'

import createEIP1193 from './createEIP1193'

const { ETHERSCAN_API_KEY } = process.env

task(
  'mastercopy:verify',
  'Verifies all mastercopies from the artifacts file, in the block explorer corresponding to the current network'
).setAction(async (_, hre) => {
  const mastercopies = JSON.parse(
    readFileSync(path.join(cwd(), 'mastercopies.json'), 'utf8')
  )

  const [signer] = await hre.ethers.getSigners()

  const provider = createEIP1193(hre.network.provider, signer)

  for (const [version, artifact] of Object.entries(mastercopies)) {
    await verify(version, artifact as MastercopyArtifact, provider)
  }
})

async function verify(
  version: string,
  artifact: MastercopyArtifact,
  provider: EIP1193Provider
) {
  const chainId = String(
    Number(await provider.request({ method: 'eth_chainId' }))
  )

  if (!ETHERSCAN_API_KEY) {
    throw new Error('Missing ENV ETHERSCAN_API_KEY')
  }

  const { noop } = await verifyMastercopy(artifact, {
    network: chainId,
    apiKey: ETHERSCAN_API_KEY as string,
  })
  if (noop) {
    console.log(`version ${version}: Mastercopy already verified`)
  } else {
    console.log(`version ${version}: Successfully verified Mastercopy`)
  }
}
