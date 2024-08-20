import { task } from 'hardhat/config'

import { writeMastercopyFromBuild } from '@gnosis-guild/zodiac-core'

import packageJson from '../package.json'

const AddressOne = '0x0000000000000000000000000000000000000001'

task(
  'extract:mastercopy',
  'Extracts and persists current mastercopy build artifacts'
).setAction(async (_, hre) => {
  writeMastercopyFromBuild({
    contractVersion: packageJson.version,
    contractName: 'Delay',
    compilerInput: await hre.run('verify:etherscan-get-minimal-input', {
      sourceName: 'contracts/Delay.sol',
    }),
    constructorArgs: {
      types: ['address', 'address', 'address', 'uint256', 'uint256'],
      values: [AddressOne, AddressOne, AddressOne, 0, 0],
    },
    salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
  })
})
