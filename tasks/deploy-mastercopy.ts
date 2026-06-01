import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre'

import { deployMastercopy, readMastercopies } from '@gnosis-guild/zodiac-core'

import { createEIP1193 } from './create-EIP1193.js'

interface DeployMastercopyTaskArguments {
  contractVersion: string
}

export default async function (
  { contractVersion }: DeployMastercopyTaskArguments,
  hre: HardhatRuntimeEnvironment
) {
  const { ethers, provider: hardhatProvider } = await hre.network.create()
  const [signer] = await ethers.getSigners()
  const { chainId } = await ethers.provider.getNetwork()
  const provider = createEIP1193(Number(chainId), hardhatProvider, signer)

  for (const mastercopy of readMastercopies({ contractVersion })) {
    const {
      contractName,
      contractVersion,
      factory,
      bytecode,
      constructorArgs,
      salt,
    } = mastercopy
    const { address, noop } = await deployMastercopy({
      factory,
      bytecode,
      constructorArgs,
      salt,
      provider,
      onStart: () => {
        console.log(
          `⏳ ${contractName}@${contractVersion}: Deployment starting...`
        )
      },
    })
    if (noop) {
      console.log(
        `🔄 ${contractName}@${contractVersion}: Already deployed at ${address}`
      )
    } else {
      console.log(
        `🚀 ${contractName}@${contractVersion}: Successfully deployed at ${address}`
      )
    }
  }
}
