import { existsSync, readFileSync, writeFileSync } from 'fs'
import { task, types } from 'hardhat/config'

import { extractMastercopy, MastercopyArtifact } from 'zodiac-core'

import packageJson from '../package.json'
import path from 'path'
import { cwd } from 'process'

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
  .setAction(async (params, hre) => {
    hre.ethers.provider
    const artifact = extractMastercopy({
      contractName: 'Delay',
      constructorArgs: {
        types: ['address', 'address', 'address', 'uint256', 'uint256'],
        values: [AddressOne, AddressOne, AddressOne, 0, 0],
      },
      salt: '0x0000000000000000000000000000000000000000000000000000000000000001',
    })

    persist(params.mastercopyVersion || packageJson.version, artifact)
  })

function persist(version: string, artifact: MastercopyArtifact) {
  const filePath = path.join(cwd(), 'mastercopies.json')

  const mastercopies = existsSync(filePath)
    ? JSON.parse(readFileSync(filePath, 'utf8'))
    : {}

  if (mastercopies[version]) {
    console.warn(`Warning: overriding previous artifact for ${version}`)
  }

  writeFileSync(
    filePath,
    JSON.stringify({ ...mastercopies, [version]: artifact }, null, 2),
    'utf8'
  )
}
