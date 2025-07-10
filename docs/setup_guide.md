# Delay Modifier Setup Guide

This guide shows how to setup a Delay Modifier with a Gnosis Safe on the Rinkeby testnetwork.

The Delay Modifier belongs to the [Zodiac](https://github.com/gnosis/zodiac) collection of tools. If you have any questions about Zodiac, join the [Gnosis Guild Discord](https://discord.gg/wwmBWTgyEq). Follow [@GnosisGuild](https://twitter.com/gnosisguild) on Twitter for updates.

## Prerequisites

To start the process you need to create a Safe on the Rinkeby test network (e.g. via https://rinkeby.gnosis-safe.io). This Safe will represent the DAO and hold all the assets (e.g. tokens and collectibles). A Safe transaction is required to setup the Delay Modifier.

For the hardhat tasks to work the environment needs to be properly configured. See the [sample env file](../.env.sample) for more information.

## Deploying the modifier

The modifier has five variables which must be set:

- `Owner`: Address that can call setter functions
- `Avatar`: Address of the DAO (e.g. a Gnosis Safe)
- `Target`: Address on which the module will call `execModuleTransaction()`
- `Cooldown`: Amount in seconds required before the transaction can be executed
- `Expiration`: Duration that a transaction is valid in seconds (or 0 if valid forever) after the cooldown

Hardhat tasks can be used to deploy a Delay Modifier instance. There are two different ways to deploy the modifier, the first one is through a normal deployment, passing arguments to the constructor (without the `proxied` flag), or, deploy the modifier through a [Minimal Proxy Factory](https://eips.ethereum.org/EIPS/eip-1167) to save on gas costs (with the `proxied` flag) - The master copy and factory address can be found in the [zodiac repository](https://github.com/gnosis/zodiac/blob/master/src/factory/constants.ts), these are the addresses that are going to be used when deploying the module through factory.

These setup tasks require the following parameters (also mentioned above):

- `Owner`: Address that can call setter functions
- `Avatar`: Address of the DAO (e.g. a Gnosis Safe)
- `Target`: Address on which the module will call `execModuleTransaction()` (this is the contract that execute the transactions))
- `Cooldown` (Optional): By default, this is set to 24 hours
- `Expiration` (Optional): By default, this is set to 7 days

For more information run `yarn hardhat setup --help`.

An example for this on Rinkeby would be:
`yarn hardhat --network rinkeby setup --owner <owner_address> --avatar <avatar_address> --target <target_address> `

or this to deploy using the proxy factory:

`yarn hardhat --network rinkeby setup ---owner <owner_address> --avatar <avatar_address> --target <target_address> --proxied true`

This should return the address of the deployed Delay Modifier. For this guide we assume this to be `0x4242424242424242424242424242424242424242`.

Once the modifier has been deployed, you should verify the source code. (Note: If you used the factory deployment, the contract should be already verified.) If you use a network that is Etherscan compatible, and you configure the `ETHERSCAN_API_KEY` in your environment, you can use the provided hardhat task to do this.

An example for this on Rinkeby would be:
`yarn hardhat --network rinkeby verifyEtherscan --modifier 0x4242424242424242424242424242424242424242 --owner <owner_address> --avatar <avatar_address>`

## Enabling the modifier

To allow the Delay Modifier to actually execute transactions, you must enable it on the Gnosis Safe to which it is connected. For this, you can use the Zodiac Safe app in the [Gnosis Safe UI](https://gnosis-safe.io/app/) to add a "custom module".

## Enabling modules on the Delay Modifier

The Delay Modifier implements the same interface as the Gnosis Safe for enabling and disabling modules, along with enqueueing transactions.

Before an address can enqueue transactions, it will need to be added as a module to the Delay Modifier. To enable an address as a module added to the Delay Modifier, follow the [adding a module](https://help.gnosis-safe.io/en/articles/4934427-add-a-module) guide, replacing the Gnosis Safe address with the Delay Modifier address.

## Monitoring your modifier

For the Delay Modifier to be effective, it is important to know which items are in queue. To make sure that all the involved stakeholders can react in a timely manner, the events emitted by the Delay Modifier contract should be monitored. Each time a new transaction is added, the contract will emit a `TransactionAdded` event with the following parameters:

```
event TransactionAdded(
  uint indexed queueNonce, // the transactions place in the queue
  bytes32 indexed txHash, // the hash of the transaction
  address to, // the to address of the transaction
  uint256 value, // the ETH value of the transaction, in wei
  bytes data, // the encoded transaction data
  Operation operation // (0) call or (1) delegate call
);
```

There are different services available for this such as the [OpenZepplin Defender Sentinel](https://docs.openzeppelin.com/defender/sentinel).

## Deploy a master copy

The master copy contracts can be deployed through the `yarn deploy` command. Note that this only should be done if the Delay Modifier contracts are updated. The ones referred to on the [Zodiac repository](https://github.com/gnosis/zodiac/blob/master/src/factory/constants.ts) should be used.
