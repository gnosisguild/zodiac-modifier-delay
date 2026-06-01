import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre'
import type { TaskArguments } from 'hardhat/types/tasks'

import { readMastercopies, verifyMastercopy } from '@gnosis-guild/zodiac-core'

import { getBlockExplorerApiUrl } from './block-explorers.js'

export default async function (
  _args: TaskArguments,
  hre: HardhatRuntimeEnvironment
) {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? ''
  const { ethers, networkName } = await hre.network.create()
  const { chainId } = await ethers.provider.getNetwork()

  for (const artifact of readMastercopies()) {
    const { noop } = await verifyMastercopy({
      artifact,
      chainId: Number(chainId),
      apiKey,
      apiUrl: getBlockExplorerApiUrl(networkName),
    })

    const { contractName, contractVersion, address } = artifact

    if (noop) {
      console.log(
        `🔄 ${contractName}@${contractVersion}: Already verified at ${address}`
      )
    } else {
      console.log(
        `🚀 ${contractName}@${contractVersion}: Successfully verified at ${address}`
      )
    }
  }
}
