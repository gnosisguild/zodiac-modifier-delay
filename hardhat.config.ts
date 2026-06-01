import hardhatToolboxMochaEthers from '@nomicfoundation/hardhat-toolbox-mocha-ethers'
import dotenv from 'dotenv'
import { ArgumentType } from 'hardhat/types/arguments'
import { defineConfig, task } from 'hardhat/config'

import { chainDescriptors } from './tasks/block-explorers.js'

dotenv.config()

const {
  INFURA_KEY,
  MNEMONIC,
  ETHERSCAN_API_KEY,
  PK,
} = process.env

const deployMastercopiesTask = task(
  'deploy:mastercopies',
  'For every version entry on the artifacts file, deploys a mastercopy into the current network'
)
  .setAction(() => import('./tasks/deploy-mastercopies.js'))
  .build()

const deployMastercopyTask = task(
  'deploy:mastercopy',
  'Deploys one mastercopy version into the current network'
)
  .addOption({
    name: 'contractVersion',
    description: 'The specific version of the contract to deploy',
    defaultValue: 'latest',
    type: ArgumentType.STRING,
  })
  .setAction(() => import('./tasks/deploy-mastercopy.js'))
  .build()

const extractMastercopyTask = task(
  'extract:mastercopy',
  'Extracts and persists current mastercopy build artifacts'
)
  .setAction(() => import('./tasks/extract-mastercopy.js'))
  .build()

const verifyMastercopiesTask = task(
  'verify:mastercopies',
  'Verifies all mastercopies from the artifacts file in the current network block explorer'
)
  .setAction(() => import('./tasks/verify-mastercopies.js'))
  .build()

const verifyMastercopyTask = task(
  'verify:mastercopy',
  'Verifies one mastercopy version in the current network block explorer'
)
  .addOption({
    name: 'contractVersion',
    description: 'Filters by a specific version or latest',
    defaultValue: 'latest',
    type: ArgumentType.STRING,
  })
  .setAction(() => import('./tasks/verify-mastercopy.js'))
  .build()

const sharedNetworkConfig = PK
  ? { accounts: [PK] }
  : {
      accounts: {
        mnemonic:
          MNEMONIC ||
          'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat',
      },
    }

const simulatedNetworkConfig = {
  type: 'edr-simulated' as const,
  chainType: 'l1' as const,
  allowUnlimitedContractSize: true,
}

function httpNetwork(config: {
  chainId: number
  url: string
  chainType?: 'generic' | 'l1' | 'op'
  gasPrice?: number
}) {
  return {
    type: 'http' as const,
    chainType: config.chainType ?? ('generic' as const),
    ...sharedNetworkConfig,
    ...config,
  }
}

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  tasks: [
    deployMastercopiesTask,
    deployMastercopyTask,
    extractMastercopyTask,
    verifyMastercopiesTask,
    verifyMastercopyTask,
  ],
  paths: {
    artifacts: 'build/artifacts',
    cache: 'build/cache',
    sources: 'contracts',
    tests: {
      mocha: 'test',
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.28',
        settings: {
          evmVersion: 'cancun',
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: 'typechain-types',
  },
  networks: {
    default: simulatedNetworkConfig,
    hardhat: simulatedNetworkConfig,
    mainnet: httpNetwork({
      chainType: 'l1',
      chainId: 1,
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    }),
    sepolia: httpNetwork({
      chainType: 'l1',
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
    }),
    optimism: httpNetwork({
      chainType: 'op',
      chainId: 10,
      url: 'https://mainnet.optimism.io',
    }),
    gnosis: httpNetwork({
      chainId: 100,
      url: 'https://rpc.gnosischain.com',
    }),
    base: httpNetwork({
      chainType: 'op',
      chainId: 8453,
      url: 'https://mainnet.base.org',
    }),
    baseSepolia: httpNetwork({
      chainType: 'op',
      chainId: 84532,
      url: 'https://sepolia.base.org',
    }),
    matic: httpNetwork({
      chainId: 137,
      url: 'https://rpc-mainnet.maticvigil.com',
    }),
    arbitrum: httpNetwork({
      chainId: 42161,
      url: 'https://arb1.arbitrum.io/rpc',
    }),
    avalanche: httpNetwork({
      chainId: 43114,
      url: 'https://rpc.ankr.com/avalanche',
    }),
    zkevm: httpNetwork({
      chainId: 1101,
      url: 'https://zkevm-rpc.com',
    }),
    bsc: httpNetwork({
      chainId: 56,
      url: 'https://bsc-rpc.publicnode.com',
    }),
    celo: httpNetwork({
      chainId: 42220,
      url: 'https://celo.drpc.org',
    }),
    lisk: httpNetwork({
      chainId: 1135,
      url: 'https://rpc.api.lisk.com',
    }),
    'lisk-sepolia': httpNetwork({
      chainId: 4202,
      url: 'https://rpc.sepolia-api.lisk.com',
      gasPrice: 1000000000,
    }),
    liskSepolia: httpNetwork({
      chainId: 4202,
      url: 'https://rpc.sepolia-api.lisk.com',
    }),
    'bob-sepolia': httpNetwork({
      chainId: 808813,
      url: 'https://bob-sepolia.rpc.gobob.xyz/',
      gasPrice: 1000000000,
    }),
    unichain: httpNetwork({
      chainType: 'op',
      chainId: 130,
      url: 'https://mainnet.unichain.org',
    }),
    mantle: httpNetwork({
      chainId: 5000,
      url: 'https://rpc.mantle.xyz',
    }),
    sonic: httpNetwork({
      chainId: 146,
      url: 'https://rpc.soniclabs.com',
    }),
    berachain: httpNetwork({
      chainId: 80094,
      url: 'https://rpc.berachain.com',
    }),
    hyperevm: httpNetwork({
      chainId: 999,
      url: 'https://rpc.hyperliquid.xyz/evm',
    }),
    worldchain: httpNetwork({
      chainType: 'op',
      chainId: 480,
      url: 'https://worldchain-mainnet.g.alchemy.com/public',
    }),
    flare: httpNetwork({
      chainId: 14,
      url: 'https://flare-api.flare.network/ext/C/rpc',
    }),
    ink: httpNetwork({
      chainType: 'op',
      chainId: 57073,
      url: 'https://rpc-qnd.inkonchain.com',
    }),
    linea: httpNetwork({
      chainId: 59144,
      url: 'https://linea-rpc.publicnode.com',
    }),
  },
  chainDescriptors,
  verify: {
    etherscan: {
      apiKey: ETHERSCAN_API_KEY ?? '',
    },
    sourcify: {
      enabled: false,
    },
  },
})
