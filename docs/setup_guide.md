# SafeDelay Setup Guide

This guide shows how to setup a delay-module with a Gnosis Safe on the Rinkeby testnetwork.

## Prerequisites

To start the process you need to create a Safe on the Rinkeby test network (e.g. via https://rinkeby.gnosis-safe.io). This Safe will represent the DAO and hold all the assets (e.g. tokens and collectibles). A Safe transaction is required to setup the delay-module.

For the hardhat tasks to work the environment needs to be properly configured. See the [sample env file](../.env.sample) for more information.

## Setting up the module

The first step is to deploy the module. Every Safe will have their own module. The module is linked to a Safe (called executor in the contract). This cannot be changed after deployment.

### Deploying the module


A hardhat task can be used to deploy a delay-module instance. This setup task requires the following parameters: `dao` (the address of the Safe). There are also optional parameters (cooldown and expiration, by default they are set to 24 hours and 7 days, respectively), for more information run `yarn hardhat setup --help`.

An example for this on Rinkeby would be:
`yarn hardhat --network rinkeby setup --dao <safe_address>`

This should return the address of the deployed delay-module. For this guide we assume this to be `0x4242424242424242424242424242424242424242`

Once the module is deployed you should verify the source code. If you use a network that is Etherscan compatible and you configure the `ETHERSCAN_API_KEY` in your environment you can use the provided hardhat task to do this.

An example for this on Rinkeby would be:
`yarn hardhat --network rinkeby verifyEtherscan --module 0x4242424242424242424242424242424242424242 --dao <safe_address>`

### Enabling the module

To allow the delay-module to actually execute transaction it is required to enable it on the Safe that it is connected to. For this it is possible to use the Transaction Builder on https://rinkeby.gnosis-safe.io. For this you can follow our tutorial on [adding a module](https://help.gnosis-safe.io/en/articles/4934427-add-a-module).

### Enabling modules on the delay-module

The delay-module implements the same interface as the Safe for enabling and disabling modules, along with enqueueing transactions.

Before an address can enqueue transactions, it will need to be added as a module to the delay-module. To enable an address as a module to the delay-module, follow the [adding a module](https://help.gnosis-safe.io/en/articles/4934427-add-a-module) guide, replacing the Safe address with the delay-module address.

## Monitoring your module

For the delay module to be effective, it is important to know which items are in queue. To make sure that all the involved stakeholders can react in a timely manner, the events emitted by the delay-module contract should be monitored. Each time a new transaction is added the contract will emit a `TransactionAdded` event with the following parameters:
```
event TransactionAdded(
  uint indexed queueNonce, // the transactions place in the queue
  bytes32 indexed txHash, // the hash of the transaction
  address to, // the to address of the transaction
  uint256 value, // the ETH value of the transaction, in wei
  bytes data, // the encoded transaction data
  Enum.Operation operation // (0) call or (1) delegate call
);
```

There are different services available for this such as the [OpenZepplin Defender Sentinel](https://docs.openzeppelin.com/defender/sentinel).
