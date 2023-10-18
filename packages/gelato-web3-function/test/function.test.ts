import path from "path";
import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
import { runWeb3Function } from "./utils";
import { AnvilServer } from "./anvil";

const w3fName = "delay-dispatch";
const w3fRootDir = path.join(__dirname, "..");
const w3fPath = path.join(w3fRootDir, "index.ts");

describe("Advertising Board Web3 Function test", () => {
  let context: Web3FunctionContextData;
  let goerliFork: AnvilServer;

  beforeAll(async () => {
    goerliFork = await AnvilServer.fork({
      forkBlockNumber: 8483100,
      forkUrl: "https://rpc.ankr.com/eth_goerli",
    });

    const { secrets } = Web3FunctionLoader.load(w3fName, w3fRootDir);
    const gasPrice = (await goerliFork.provider.getGasPrice()).toString();

    context = {
      secrets,
      storage: {},
      gelatoArgs: {
        chainId: 5,
        gasPrice,
      },
      userArgs: {},
    };
  }, 10000);

  afterAll(async () => {
    goerliFork.kill();
  });

  it("does nothing if the queue is empty", async () => {
    const blockTime = (await goerliFork.provider.getBlock("latest")).timestamp;

    // mock storage state of "lastPost"
    context.storage = { lastPost: blockTime.toString() };

    const res = await runWeb3Function(w3fPath, context, [goerliFork.provider]);

    expect(res.result.canExec).toEqual(false);
  });

  it("does nothing if no transaction is executable", async () => {
    const blockTimeBefore = (await goerliFork.provider.getBlock("latest"))
      .timestamp;
    const nextPostTime = blockTimeBefore + 3600;

    // fast forward block time
    await goerliFork.provider.send("evm_mine", [nextPostTime]);

    // pass current block time
    const blockTime = (await goerliFork.provider.getBlock("latest")).timestamp;

    const res = await runWeb3Function(w3fPath, context, [goerliFork.provider]);

    expect(res.result.canExec).toEqual(true);

    // expect "lastPost" to be updated
    expect(res.storage.state).toEqual("updated");
    expect(res.storage.storage["lastPost"]).toEqual(blockTime.toString());
  });

  it("skips over expired transactions to execute executable transactions");

  it("respects the gas allowance");
});
