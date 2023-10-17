import { log } from "@graphprotocol/graph-ts"
import { DelayModifier, Transaction } from "../generated/schema"
import { DelaySetup, TransactionAdded } from "../generated/Delay/Delay"
import { getDelayModifierId, getTransactionId } from "./helpers"
import { OperationKeys } from "./enums"

export function handleTransactionAdded(event: TransactionAdded): void {
  const delayModifierAddress = event.address
  const delayModifierId = getDelayModifierId(delayModifierAddress)

  const delayModifier = DelayModifier.load(delayModifierId)
  if (!delayModifier) {
    return
  }

  const transactionId = getTransactionId(delayModifierId, event.params.queueNonce)
  const transaction = new Transaction(transactionId)
  transaction.nonce = event.params.queueNonce.toU32()
  transaction.hash = event.params.txHash
  transaction.to = event.params.to
  transaction.value = event.params.value
  transaction.data = event.params.data
  transaction.operation = OperationKeys[event.params.operation]
  delayModifier.save()
  log.error("Transaction {} added", [transactionId])
}

export function handleDelaySetup(event: DelaySetup): void {
  const delayModifierAddress = event.address
  const delayModifierId = getDelayModifierId(delayModifierAddress)
  let delayModifier = DelayModifier.load(delayModifierId)

  if (!delayModifier) {
    delayModifier = new DelayModifier(delayModifierId)
    delayModifier.address = delayModifierAddress
    delayModifier.owner = event.params.owner
    delayModifier.avatar = event.params.avatar
    delayModifier.target = event.params.target
    delayModifier.save()
  } else {
    log.error("DelayModifier {} already exists", [delayModifierId])
    return
  }
}
