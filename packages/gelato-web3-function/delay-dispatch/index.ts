import { Web3Function } from "@gelatonetwork/web3-functions-sdk";
import { GelatoRelay } from "@gelatonetwork/relay-sdk";
import { BigNumber, Contract } from "ethers";
import { MulticallWrapper } from "ethers-multicall-provider";
import ky from "ky"; // gelato recommends using ky as axios doesn't support fetch by default

const DELAY_ABI = [
  "function executeNextTx(address to, uint256 value, bytes data, uint8 operation)",
  "function skipExpired()",
  "function txCooldown() view returns (uint256)",
  "function txExpiration() view returns (uint256)",
  "function txNonce() view returns (uint256)",
];

Web3Function.onRun(async (context) => {
  const {
    userArgs,
    storage,
    multiChainProvider,
    gelatoArgs: { chainId },
  } = context;

  const relayApiKey = await context.secrets.get("RELAY_API_KEY");
  if (!relayApiKey) {
    throw new Error("Missing RELAY_API_KEY secret");
  }

  // parse user args
  const delayModAddress = userArgs.delayMod as string;
  if (!delayModAddress) {
    throw new Error("Missing delayMod userArg");
  }
  const gasAllowanceString = userArgs.gasAllowance as string;
  let allowanceInterval = userArgs.allowanceInterval as number;
  let gasAllowance: BigNumber;
  try {
    gasAllowance = BigNumber.from(gasAllowanceString);
  } catch (err) {
    throw new Error(`Invalid gasAllowance userArg: ${gasAllowanceString}`);
  }
  if (typeof allowanceInterval !== "number" || allowanceInterval < 0) {
    throw new Error(`Invalid allowanceInterval userArg: ${allowanceInterval}`);
  }

  // This will be a provider for the chain this function is deployed for (gelatoArgs.chainId)
  // It will automatically batch calls via the Multicall3 contract
  const provider = MulticallWrapper.wrap(multiChainProvider.default());
  const delayMod = new Contract(delayModAddress, DELAY_ABI, provider);

  // Query Delay mod contract for current nonce, cooldown, expiration
  let nonce, cooldown, expiration: BigNumber;
  let currentBlock: number;
  try {
    [nonce, cooldown, expiration, currentBlock] = await Promise.all([
      delayMod.txNonce() as Promise<BigNumber>,
      delayMod.txCooldown() as Promise<BigNumber>,
      delayMod.txExpiration() as Promise<BigNumber>,
      provider.getBlockNumber(),
    ]);
  } catch (e) {
    console.error(e);
    return {
      canExec: false,
      message: `Delay mod contract not deployed at ${delayModAddress}`,
    };
  }

  // Query subgraph for upcoming transactions
  let transactions: Transaction[] = [];
  try {
    transactions = await fetchUpcomingTransactions({
      chainId,
      address: delayModAddress,
      currentNonce: nonce.toNumber(),
    });
  } catch (e: any) {
    return { canExec: false, message: `Subgraph query failed (${e.message})` };
  }

  // Retrieve current & last processed block number

  const lastBlockStr = await storage.get("lastBlockNumber");
  let lastBlock = lastBlockStr ? parseInt(lastBlockStr) : 0;
  console.log(
    `Last processed block: ${lastBlock}, current block: ${currentBlock}`
  );

  // Retrieve gas allowance balance and top up with accrued if needed
  const accrued = allowanceInterval
    ? gasAllowance.mul(currentBlock - lastBlock).div(allowanceInterval)
    : BigNumber.from(0);
  const previousGasBalance = BigNumber.from(
    (await storage.get("gasBalance")) || gasAllowance
  );
  const newBalanceUncapped = previousGasBalance.add(accrued);
  let gasBalance =
    newBalanceUncapped > gasAllowance ? gasAllowance : newBalanceUncapped;
  console.log(
    `Gas allowance left: ${gasBalance.toString()}, topped up from ${previousGasBalance.toString()}`
  );

  // Init Gelato relay
  const gelatoRelay = new GelatoRelay();
  let callsMade = 0;

  /** Dispatches a call to the Delay mod through the Gelato relay and keeps the gas allowance in check */
  const relay = async (data: string) => {
    const gasLimit = await provider.estimateGas({
      to: delayModAddress,
      data,
    });

    if (gasLimit.gt(gasBalance)) {
      console.log(
        `Gas allowance insufficient: ${gasBalance.toString()}. Skipping call with gas limit ${gasLimit.toString()}`
      );
      return false;
    }

    gasBalance = gasBalance.sub(gasLimit);

    const result = await gelatoRelay.sponsoredCall(
      { chainId: BigInt(chainId), target: delayModAddress, data },
      relayApiKey,
      {
        gasLimit: BigInt(gasLimit.toString()),
      }
    );
    callsMade++;
    return result;
  };

  /** Update storage for tracking gas allowance balance */
  const updateStorage = async () => {
    if (callsMade > 0) {
      await storage.set("lastBlockNumber", currentBlock.toString());
      await storage.set("gasBalance", gasBalance.toString());
    }
  };

  // Filter transactions that are ready to be executed
  const now = Math.floor(Date.now() / 1000);
  const cooledTransactions = transactions.filter(
    (tx) => tx.createdAt + cooldown.toNumber() <= now
  );

  // Cooled & unexpired
  const executableTransactions = expiration.gt(0)
    ? cooledTransactions.filter(
        (tx) =>
          tx.createdAt + cooldown.toNumber() + expiration.toNumber() >= now
      )
    : cooledTransactions;

  if (executableTransactions.length === 0) {
    return {
      canExec: false,
      message: `No executable transactions found`,
    };
  }

  // Check if there are expired transactions. If so, relay a call to skip them first
  if (expiration.gt(0)) {
    const expiredTransactions = cooledTransactions.filter(
      (tx) => tx.createdAt + cooldown.toNumber() + expiration.toNumber() <= now
    );

    if (expiredTransactions) {
      console.log(
        `Skipping ${expiredTransactions.length} expired transactions`
      );
      try {
        await relay(delayMod.interface.encodeFunctionData("skipExpired"));
      } catch (e: any) {
        await updateStorage();
        return {
          canExec: false,
          message: `Failed to relay skipExpired() call: ${e.message}`,
        };
      }
    }
  }

  // Relay all executable transactions
  for (let tx of executableTransactions) {
    try {
      const result = await relay(
        delayMod.interface.encodeFunctionData("executeNextTx", [
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
        ])
      );
      if (result === false) break;
    } catch (e: any) {
      await updateStorage();
      return {
        canExec: false,
        message: `Failed to execute transaction with nonce ${tx.nonce}: ${e.message}`,
      };
    }
  }

  if (callsMade > 0) {
    await updateStorage();
    return {
      canExec: true,
      callData: [],
    };
  } else {
    return {
      canExec: false,
      message: `Gas allowance balance of ${gasBalance} insufficient for executing next transaction from queue`,
    };
  }
});

const QUERY = `
query DelayTransactions($id: String, $nonce: Int) {
  delayModifier(id: $id) {
    transactions(where: {nonce_gt: $nonce}) {
      nonce
      to
      data
      hash
      value
      operation
      createdAt
    }
  }
}
`.trim();

interface Transaction {
  nonce: number;
  to: string;
  data: string;
  hash: string;
  value: string;
  operation: 0 | 1;
  createdAt: number;
}

const SUBGRAPH = {
  [1]: "https://api.studio.thegraph.com/query/23167/zodiac-delay-mainnet/v0.0.4",
  [5]: "https://api.studio.thegraph.com/query/23167/zodiac-delay-goerli/v0.0.4",
  // [10]: "https://api.studio.thegraph.com/query/23167/zodiac-delay-optimism/v0.0.4",
  // [56]: "https://api.studio.thegraph.com/query/23167/zodiac-delay-bsc/v0.0.4",
  [100]:
    "https://api.studio.thegraph.com/query/23167/zodiac-delay-gnosis/v0.0.4",
  [137]:
    "https://api.studio.thegraph.com/query/23167/zodiac-delay-polygon/v0.0.4",
  [42161]:
    "https://api.studio.thegraph.com/query/23167/zodiac-delay-arbitrum/v0.0.4",
  [43114]:
    "https://api.studio.thegraph.com/query/23167/zodiac-delay-avalanche/v0.0.4",
};

const fetchUpcomingTransactions = async ({
  chainId,
  address,
  currentNonce,
}: {
  chainId: number;
  address: string;
  currentNonce: number;
}): Promise<Transaction[]> => {
  const { data } = (await ky
    .post(SUBGRAPH[chainId as keyof typeof SUBGRAPH], {
      timeout: 5_000,
      retry: 1,
      json: {
        query: QUERY,
        variables: { id: address.toLowerCase(), nonce: currentNonce },
        operationName: "DelayTransactions",
      },
    })
    .json()) as any;

  if (!data || !data.delayModifier) {
    return [];
  }

  const transactions = data.delayModifier.transactions.map((tx: any) => ({
    ...tx,
    operation: tx.operation === "Call" ? 0 : 1,
  })) as Transaction[];

  return transactions.sort((a, b) => a.nonce - b.nonce);
};
