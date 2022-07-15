# Zodiac Delay Modifier

[![Build Status](https://github.com/gnosis/zodiac-modifier-delay/actions/workflows/ci.yml/badge.svg)](https://github.com/gnosis/zodiac-modifier-delay/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/gnosis/zodiac-modifier-delay/badge.svg?branch=main)](https://coveralls.io/github/gnosis/zodiac-modifier-delay)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://github.com/gnosis/CODE_OF_CONDUCT)


The Delay Modifier belongs to the [Zodiac](https://github.com/gnosis/zodiac) collection of tools, which can be accessed through the Zodiac App available on [Gnosis Safe](https://gnosis-safe.io/), as well as in this repository. 

If you have any questions about Zodiac, join the [Gnosis Guild Discord](https://discord.gg/wwmBWTgyEq). Follow [@GnosisGuild](https://twitter.com/gnosisguild) on Twitter for updates.

### About the Delay Modifier

This modifier allows avatars to enforce a time delay between when a module initiates a transaction and when it can be executed by an avatar.

This means an pproved address can execute transactions only after a cooldown period and, optionally, before an expiration time.

The interface mirrors the relevant parts of the Gnosis Safe's interface, so this contract can be placed between Gnosis Safe modules and a Gnosis Safe to enforce a time delay between transaction creation and execution.

Transactions are executed in order. The Gnosis Safe can skip transactions by advancing the transaction nonce.

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

Follow our [Delay Modifier Setup Guide](./docs/setup_guide.md).

### Audits

An audit has been performed by the [G0 group](https://github.com/g0-group).

All issues and notes of the audit have been addressed in commit [95c75547edf075d3c7a0f23e93ff856dedd17507](https://github.com/gnosis/zodiac-modifier-delay/commit/95c75547edf075d3c7a0f23e93ff856dedd17507).

The audit results are available as a pdf in [this repo](audits/ZodiacDelayModuleSep2021.pdf) or on the [g0-group repo](https://github.com/g0-group/Audits/blob/e11752abb010f74e32a6fc61142032a10deed578/ZodiacDelayModuleSep2021.pdf).

### Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

### License

Created under the [LGPL-3.0+ license](LICENSE).
