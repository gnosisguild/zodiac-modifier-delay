import path from 'path'
import { cwd } from 'process'
import { readFileSync } from 'fs'
import { task } from 'hardhat/config'

import { verifyMastercopy, MastercopyArtifact } from 'zodiac-core'

const { ETHERSCAN_API_KEY } = process.env

task(
  'mastercopy:verify',
  'Verifies all mastercopies from the artifacts file, in the block explorer corresponding to the current network'
).setAction(async (_, hre) => {
  if (!ETHERSCAN_API_KEY) {
    throw new Error('Missing ENV ETHERSCAN_API_KEY')
  }

  const mastercopies = JSON.parse(
    readFileSync(path.join(cwd(), 'mastercopies.json'), 'utf8')
  )

  const chainId = hre.network.config.chainId!

  for (const [version, artifact] of Object.entries(mastercopies)) {
    await verify(version, artifact as MastercopyArtifact, chainId)
  }
})

async function verify(
  version: string,
  artifact: MastercopyArtifact,
  chainId: number
) {
  const { noop } = await verifyMastercopy(artifact, {
    network: String(chainId),
    apiKey: ETHERSCAN_API_KEY as string,
  })
  if (noop) {
    console.log(`version ${version}: Mastercopy already verified`)
  } else {
    console.log(`version ${version}: Successfully verified Mastercopy`)
  }
}
