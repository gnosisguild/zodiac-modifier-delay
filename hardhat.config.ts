import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-verify'
import 'hardhat-gas-reporter'

import dotenv from 'dotenv'
import { HttpNetworkUserConfig } from 'hardhat/types'

dotenv.config()

import './tasks/deploy-mastercopies'
import './tasks/deploy-mastercopy'
import './tasks/extract-mastercopy'
import './tasks/verify-mastercopies'
import './tasks/verify-mastercopy'

const { INFURA_KEY, MNEMONIC, ETHERSCAN_API_KEY, PK } = process.env

const sharedNetworkConfig: HttpNetworkUserConfig = {}
if (PK) {
  sharedNetworkConfig.accounts = [PK]
} else {
  sharedNetworkConfig.accounts = {
    mnemonic:
      MNEMONIC ||
      'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat',
  }
}

export default {
  paths: {
    artifacts: 'build/artifacts',
    cache: 'build/cache',
    sources: 'contracts',
  },
  solidity: {
    compilers: [{ version: '0.8.20' }],
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000,
      gas: 100000000,
    },
    mainnet: {
      ...sharedNetworkConfig,
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    },
    gnosis: {
      ...sharedNetworkConfig,
      url: 'https://rpc.gnosischain.com',
    },
    mumbai: {
      ...sharedNetworkConfig,
      url: `https://polygon-mumbai.infura.io/v3/${INFURA_KEY}`,
    },
    polygon: {
      ...sharedNetworkConfig,
      url: `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
    },
    volta: {
      ...sharedNetworkConfig,
      url: `https://volta-rpc.energyweb.org`,
    },
    bsc: {
      ...sharedNetworkConfig,
      url: `https://bsc-dataseed.binance.org/`,
    },
    arbitrum: {
      ...sharedNetworkConfig,
      url: `https://arb1.arbitrum.io/rpc`,
    },
    avalanche: {
      ...sharedNetworkConfig,
      url: `https://api.avax.network/ext/bc/C/rpc`,
    },
    matic: {
      ...sharedNetworkConfig,
      url: 'https://rpc-mainnet.maticvigil.com',
    },
    sepolia: {
      ...sharedNetworkConfig,
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
    },
    'lisk-sepolia': {
      ...sharedNetworkConfig,
      chainId: 4202,
      url: 'https://rpc.sepolia-api.lisk.com',
      gasPrice: 1000000000,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    customChains: [
      {
        network: 'lisk-sepolia',
        chainId: 4202,
        urls: {
          apiURL: 'https://sepolia-blockscout.lisk.com/api',
          browserURL: 'https://sepolia-blockscout.lisk.com',
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  gasReporter: {
    enabled: true,
  },
}
