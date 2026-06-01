import type { EIP1193Provider } from '@gnosis-guild/zodiac-core'

/**
 * zodiac-core v4 ships as an ESM-only package (its `exports` map exposes no
 * `require`/`default` condition). Hardhat runs tasks through ts-node in
 * CommonJS mode and rewrites a regular `import()` into `require()`, which fails
 * to resolve the package. Wrapping the dynamic import in `new Function` keeps
 * it as a genuine ESM `import()` at runtime.
 */
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<typeof import('@gnosis-guild/zodiac-core')>

export function loadZodiacCore() {
  return importEsm('@gnosis-guild/zodiac-core')
}

export type { EIP1193Provider }
