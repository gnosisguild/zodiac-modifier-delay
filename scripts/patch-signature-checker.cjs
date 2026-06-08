const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const target = join(
  process.cwd(),
  'node_modules/@gnosis-guild/zodiac-core/contracts/signature/SignatureChecker.sol'
)

const vulnerable = `    (, bytes memory returnData) = signer.staticcall(
      abi.encodeWithSelector(
        IERC1271.isValidSignature.selector,
        hash,
        signature
      )
    );

    return bytes4(returnData) == EIP1271_MAGIC_VALUE;`

const fixed = `    (bool success, bytes memory returnData) = signer.staticcall(
      abi.encodeWithSelector(
        IERC1271.isValidSignature.selector,
        hash,
        signature
      )
    );

    return success && bytes4(returnData) == EIP1271_MAGIC_VALUE;`

if (!existsSync(target)) {
  throw new Error(`SignatureChecker not found: ${target}`)
}

const source = readFileSync(target, 'utf8')

if (source.includes(fixed)) {
  console.log(`SignatureChecker already patched: ${target}`)
  process.exit(0)
}

if (!source.includes(vulnerable)) {
  throw new Error(`SignatureChecker patch target did not match: ${target}`)
}

writeFileSync(target, source.replace(vulnerable, fixed), 'utf8')
console.log(`Patched SignatureChecker: ${target}`)
