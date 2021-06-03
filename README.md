# DAO Module
[![Build Status](https://github.com/gnosis/SafeDelay/workflows/SafeDelay/badge.svg?branch=main)](https://github.com/gnosis/SafeDelay/actions)
[![Coverage Status](https://coveralls.io/repos/github/gnosis/SafeDelay/badge.svg?branch=main)](https://coveralls.io/github/gnosis/SafeDelay)

This module allows for execution of transactions created by an approved address, only after a cooldown period and, optionally, before an expiration time.

The interface mirrors the relevant parts of the Gnosis Safe's interface, so this contract can be placed between Gnosis Safe modules and a Gnosis Safe enforce a time delay between transaction creation and execution.

Transactions are executed in order. The Safe can skip transactions by advancing the transaction nonce.

### Features
- Enqueue transactions
- Enable and disable modules
- Public function to execute the next transaction in queue
- Skip transactions by advancing the nonce
- Set cooldown and expiration periods

### Flow
- Enqueue transactions by calling `execTransactionFromModule()`
- Wait for cooldown ⏱️
- Anyone can execute the next transaction by calling `executeNextTx`

### Solidity Compiler

The contracts have been developed with [Solidity 0.8.0](https://github.com/ethereum/solidity/releases/tag/v0.8.0) in mind. This version of Solidity made all arithmetic checked by default, therefore eliminating the need for explicit overflow or underflow (or other arithmetic) checks.

### Setup Guide

Follow our [SafeDelay Setup Guide](./docs/setup_guide.md) to setup and use a DelayModule.
