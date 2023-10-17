import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts"

export const getDelayModifierId = (delayModifier: Address): string => delayModifier.toHex()
export const getTransactionId = (delayModifierId: string, nonce: BigInt): string => delayModifierId + "-TX-" + nonce.toString()
