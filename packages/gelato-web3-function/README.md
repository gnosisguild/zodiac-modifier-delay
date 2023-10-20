# Gelato web3 function for automated execution

This Gelato web3 function can be started for a Delay mod to automatically execute enqueued transactions as soon as the cooldown period has passed.

The latest version is deployed at IPFS CID: `QmYcfTe7pMaSEHpVAUvTQp6BjofXc8rAz5mnvgUR9t2bkm`

## How to run

### With Gelato Automate SDK

```ts
import { AutomateSDK } from "@gelatonetwork/automate-sdk";

const automate = new AutomateSDK(chainId, wallet);

const { taskId, tx } = await automate.createBatchExecTask({
  name: "Web3Function - Delay dispatch",
  web3FunctionHash: "QmYcfTe7pMaSEHpVAUvTQp6BjofXc8rAz5mnvgUR9t2bkm",
  web3FunctionArgs: {
    delayMod: "0x...", // address of the Delay mod to watch
    gasAllowance: 1_000_000, // total gas that can be spent per interval
    allowanceInterval: 7150, // unit is blocks (7150 blocks is roughly one day on mainnet)
  },
});

await web3Function.secrets.set(
  {
    RELAY_API_KEY: "<YOUR GELATO RELAY API KEY>",
  },
  taskId
);
```

### With Gelato app

Go to https://beta.app.gelato.network/ and create a task in the desired interval and providing the IPFS CID `QmYcfTe7pMaSEHpVAUvTQp6BjofXc8rAz5mnvgUR9t2bkm`.

More info: https://docs.gelato.network/developer-services/web3-functions/running-web3-functions
