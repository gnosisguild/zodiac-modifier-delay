import type { EIP1193Provider } from '@gnosis-guild/zodiac-core'
import type { Signer } from 'ethers'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const shallUseFrame = process.env.USE_FRAME === 'true'

type RequestProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

type ProviderOpts = {
  name: string
  origin: string
  infuraId: string
  alchemyId: string
  interval: number
}

type FrameProvider = {
  setChain(chainId: number): void
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

type EthProviderFactory = (
  targets?: string | string[],
  opts?: Partial<ProviderOpts>
) => FrameProvider

const ethProvider = require('eth-provider') as EthProviderFactory

export function createEIP1193(
  chainId: number | undefined,
  provider: RequestProvider,
  signer: Signer
): EIP1193Provider {
  return {
    request: async ({ method, params }) => {
      if (method == 'eth_sendTransaction') {
        if (shallUseFrame) {
          return requestUsingFrame(chainId, method, params)
        }

        const { hash } = await signer.sendTransaction((params as any[])[0])
        return hash
      }

      return provider.request({ method, params })
    },
  }
}

const requestUsingFrame = async (
  chainId: number | undefined,
  method: string,
  params: any
) => {
  if (!chainId) throw new Error('Chain ID is required when using frame')
  const frame = ethProvider('frame')
  frame.setChain(chainId)
  // fix for "Transaction parameter 'gasLimit' is not a valid hex string" RPC error
  if (Array.isArray(params) && typeof params[0].gasLimit === 'number') {
    params[0].gasLimit = '0x' + params[0].gasLimit.toString(16)
  }
  return frame.request({ method, params })
}
