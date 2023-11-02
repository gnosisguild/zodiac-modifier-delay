import { AbiCoder, ZeroHash } from 'ethers'
import { task } from 'hardhat/config'

import { deployViaFactory } from './eip2470'

const AddressOne = '0x0000000000000000000000000000000000000001'

task('deploy:mastercopy', 'Deploys and verifies Delay mastercopy').setAction(
  async (_, hre) => {
    const [deployer] = await hre.ethers.getSigners()

    const Delay = await hre.ethers.getContractFactory('Delay')

    const args = AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'address', 'uint256', 'uint256'],
      [AddressOne, AddressOne, AddressOne, 0, 0]
    )

    const creationBytecode = `${Delay.bytecode}${args.substring(2)}`
    const salt = ZeroHash
    const address = await deployViaFactory(creationBytecode, salt, deployer)

    if (hre.network.name == 'hardhat') {
      return
    }

    console.log('Waiting 1 minute before etherscan verification start...')
    // Etherscan needs some time to process before trying to verify.
    await new Promise((resolve) => setTimeout(resolve, 60000))

    await hre.run('verify:verify', {
      address,
      constructorArguments: [AddressOne, AddressOne, AddressOne, 0, 0],
    })
  }
)

export {}
