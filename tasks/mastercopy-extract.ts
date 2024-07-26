import { task, types } from 'hardhat/config'

import { mastercopiesExtract } from 'zodiac-core'

import packageJson from '../package.json'

const AddressOne = '0x0000000000000000000000000000000000000001'

task(
  'mastercopy:extract',
  'Extracts current mastercopy build artifacts, and persists it'
)
  .addParam(
    'mastercopyVersion',
    'The version used to insert into the Artifacts object',
    undefined,
    types.string,
    true
  )
  .setAction(async (params) => {
    const version = params.mastercopyVersion || packageJson.version

    mastercopiesExtract({
      version,
      contractName: 'Delay',
      constructorArgs: {
        types: ['address', 'address', 'address', 'uint256', 'uint256'],
        values: [AddressOne, AddressOne, AddressOne, 0, 0],
      },
      salt: '0x0000000000000000000000000000000000000000000000000000000000000001',
    })
  })
