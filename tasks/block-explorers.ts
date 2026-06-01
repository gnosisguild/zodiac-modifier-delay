export const blockExplorerConfigs = [
  {
    network: 'optimism',
    chainId: 10,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=10',
    browserURL: 'https://optimistic.etherscan.io',
  },
  {
    network: 'gnosis',
    chainId: 100,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=100',
    browserURL: 'https://www.gnosisscan.io',
  },
  {
    network: 'matic',
    chainId: 137,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=137',
    browserURL: 'https://www.polygonscan.com',
  },
  {
    network: 'arbitrum',
    chainId: 42161,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=42161',
    browserURL: 'https://www.arbiscan.io',
  },
  {
    network: 'avalanche',
    chainId: 43114,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=43114',
    browserURL: 'https://www.snowtrace.io',
  },
  {
    network: 'zkevm',
    chainId: 1101,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=1101',
    browserURL: 'https://zkevm.polygonscan.com',
  },
  {
    network: 'bsc',
    chainId: 56,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=56',
    browserURL: 'https://bscscan.com',
  },
  {
    network: 'celo',
    chainId: 42220,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=42220',
    browserURL: 'https://celoscan.io',
  },
  {
    network: 'mantle',
    chainId: 5000,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=5000',
    browserURL: 'https://mantlescan.xyz',
  },
  {
    network: 'unichain',
    chainId: 130,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=130',
    browserURL: 'https://uniscan.xyz',
  },
  {
    network: 'sonic',
    chainId: 146,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=146',
    browserURL: 'https://sonicscan.org',
  },
  {
    network: 'berachain',
    chainId: 80094,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=80094',
    browserURL: 'https://berascan.com',
  },
  {
    network: 'hyperevm',
    chainId: 999,
    apiURL: 'https://www.hyperscan.com/api',
    browserURL: 'https://www.hyperscan.com',
  },
  {
    network: 'lisk-sepolia',
    chainId: 4202,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=4202',
    browserURL: 'https://sepolia-blockscout.lisk.com',
  },
  {
    network: 'bob-sepolia',
    chainId: 808813,
    apiURL: 'https://api.etherscan.io/v2/api?chainid=808813',
    browserURL: 'https://bob-sepolia.explorer.gobob.xyz',
  },
  {
    network: 'worldchain',
    chainId: 480,
    apiURL: 'https://api.worldscan.org/api',
    browserURL: 'https://worldscan.org',
  },
  {
    network: 'flare',
    chainId: 14,
    apiURL: 'https://api.routescan.io/v2/network/mainnet/evm/14/etherscan/api',
    browserURL: 'https://flarescan.com',
  },
  {
    network: 'ink',
    chainId: 57073,
    apiURL: 'https://explorer.inkonchain.com/api',
    browserURL: 'https://explorer.inkonchain.com',
  },
  {
    network: 'linea',
    chainId: 59144,
    apiURL: 'https://api.lineascan.build/api',
    browserURL: 'https://lineascan.build',
  },
] as const

export function getBlockExplorerApiUrl(networkName: string) {
  return blockExplorerConfigs.find(({ network }) => network === networkName)
    ?.apiURL
}

export const chainDescriptors = Object.fromEntries(
  blockExplorerConfigs.map(({ network, chainId, apiURL, browserURL }) => [
    chainId,
    {
      name: network,
      blockExplorers: {
        etherscan: {
          name: network,
          url: browserURL,
          apiUrl: apiURL.replace(/\?chainid=.*$/, ''),
        },
      },
    },
  ])
)
