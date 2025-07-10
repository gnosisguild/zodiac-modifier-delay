import { task, types } from 'hardhat/config'
import { readMastercopies, verifyMastercopy } from '@gnosis-guild/zodiac-core'

task(
  'verify:mastercopy',
  'Verifies all mastercopies from the artifacts file in the block explorer corresponding to the current network'
)
  .addOptionalParam(
    'contractVersion',
    'Filters by a specific version or lateat',
    'latest', // Default value
    types.string
  )
  .setAction(async ({ contractVersion }, hre) => {
    const apiKey = hre.config.etherscan.apiKey as string

    const chainId = String((await hre.ethers.provider.getNetwork()).chainId)
    for (const artifact of readMastercopies({ contractVersion })) {
      const { noop } = await verifyMastercopy({
        artifact,
        chainId: Number(chainId),
        apiKey,
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
  })
