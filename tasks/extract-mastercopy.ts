import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre'
import type { TaskArguments } from 'hardhat/types/tasks'

import { writeMastercopyFromBuild } from '@gnosis-guild/zodiac-core'

import packageJson from '../package.json' with { type: 'json' }

const AddressOne = '0x0000000000000000000000000000000000000001'

export default async function (
  _args: TaskArguments,
  _hre: HardhatRuntimeEnvironment
) {
  // zodiac-core's `getBuildArtifact` still expects the Hardhat 2 artifact
  // layout: a `<Contract>.dbg.json` sidecar pointing at the build-info file.
  // Hardhat 3 dropped the sidecar and instead records `buildInfoId` inside the
  // artifact JSON, with build-info split into `<id>.json` (input) and
  // `<id>.output.json`. The input half already matches what zodiac-core reads
  // (`{ solcLongVersion, input }`), so we just recreate the sidecar that points
  // to it.
  writeDbgSidecar('contracts/Delay.sol', 'Delay')

  writeMastercopyFromBuild({
    contractVersion: packageJson.version,
    contractName: 'Delay',
    constructorArgs: {
      types: ['address', 'address', 'address', 'uint256', 'uint256'],
      values: [AddressOne, AddressOne, AddressOne, 0, 0],
    },
    salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
  })
}

function writeDbgSidecar(sourceName: string, contractName: string) {
  const artifactPath = join(
    process.cwd(),
    'build',
    'artifacts',
    sourceName,
    `${contractName}.json`
  )
  const { buildInfoId } = JSON.parse(readFileSync(artifactPath, 'utf8'))
  const buildInfo = join('..', '..', 'build-info', `${buildInfoId}.json`)
  writeFileSync(
    join(dirname(artifactPath), `${contractName}.dbg.json`),
    JSON.stringify({ _format: 'hh-sol-dbg-1', buildInfo })
  )
}
