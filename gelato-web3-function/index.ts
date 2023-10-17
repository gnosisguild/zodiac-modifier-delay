import { Log } from "@ethersproject/providers";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";

const MAX_RANGE = 100; // limit range of events to comply with rpc providers
const MAX_REQUESTS = 100; // limit number of requests on every execution to avoid hitting timeout
const LOOKBACK_RANGE = 2000; // number of blocks to look back for events on first run

const DELAY_ABI = [
  "event TransactionAdded(uint256 indexed queueNonce, bytes32 indexed txHash, address to, uint256 value, bytes data, uint8 operation)",
  "function executeNextTx(address to, uint256 value, bytes data, uint8 operation)",
  "function skipExpired()",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  const delayModAddress = userArgs.delayMod as string;
  if (!delayModAddress) {
    throw new Error("Missing delayMod userArg");
  }
  const delayMod = new Contract(delayModAddress, DELAY_ABI, provider);

  // Retrieve current & last processed block number
  const currentBlock = await provider.getBlockNumber();
  const lastBlockStr = await storage.get("lastBlockNumber");
  let lastBlock = lastBlockStr
    ? parseInt(lastBlockStr)
    : currentBlock - LOOKBACK_RANGE;
  console.log(
    `Last processed block: ${lastBlock}, current block: ${currentBlock}`
  );

  // Retrieve gas allowance balance and top up with accrued if needed
  const gasAllowanceString = userArgs.gasAllowance as string;
  const allowanceRefillInterval = userArgs.allowanceRefillInterval as number;
  let gasAllowance: BigNumber;
  try {
    gasAllowance = BigNumber.from(gasAllowanceString);
  } catch (err) {
    throw new Error(`Invalid gasAllowance userArg: ${gasAllowanceString}`);
  }
  const accrued = allowanceRefillInterval
    ? gasAllowance.mul(currentBlock - lastBlock).div(allowanceRefillInterval)
    : BigNumber.from(0);
  const previousGasBalance = BigNumber.from(
    (await storage.get("gasBalance")) || gasAllowance
  );
  const newBalanceUncapped = previousGasBalance.add(accrued);
  const newBalance =
    newBalanceUncapped > gasAllowance ? gasAllowance : newBalanceUncapped;
  console.log(
    `Gas allowance left: ${newBalance.toString()}, topped up from ${previousGasBalance.toString()}`
  );

  // Fetch recent logs in range of 100 blocks
  const logs: Log[] = [];
  let requestsCount = 0;
  while (lastBlock < currentBlock && requestsCount < MAX_REQUESTS) {
    requestsCount++;
    const fromBlock = lastBlock + 1;
    const toBlock = Math.min(fromBlock + MAX_RANGE, currentBlock);
    console.log(
      `Fetching TransactionAdded events from blocks ${fromBlock} to ${toBlock}`
    );
    try {
      const eventFilter = {
        address: delayModAddress,
        topics: [delayMod.interface.getEventTopic("TransactionAdded")],
        fromBlock,
        toBlock,
      };
      const result = await provider.getLogs(eventFilter);
      logs.push(...result);
      lastBlock = toBlock;
    } catch (err: any) {
      return { canExec: false, message: `Rpc call failed: ${err.message}` };
    }
  }

  // Parse retrieved events
  console.log(`Matched ${logs.length} new events`);
  const nbNewEvents = logs.length;
  totalEvents += logs.length;
  for (const log of logs) {
    const event = oracle.interface.parseLog(log);
    const [time, price] = event.args;
    console.log(
      `Price updated: ${price}$ at ${new Date(time * 1000).toUTCString()}`
    );
  }

  // Update storage for next run
  await storage.set("lastBlockNumber", currentBlock.toString());
  await storage.set("totalEvents", totalEvents.toString());

  if (nbNewEvents === 0) {
    return {
      canExec: false,
      message: `Total events matched: ${totalEvents} (at block #${currentBlock.toString()})`,
    };
  }

  // Increase number of events matched on our OracleCounter contract
  return {
    canExec: true,
    callData: [
      {
        to: counterAddress,
        data: counter.interface.encodeFunctionData("increaseCount", [
          nbNewEvents,
        ]),
      },
    ],
  };
});
