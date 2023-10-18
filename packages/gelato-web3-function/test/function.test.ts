import path from "path";
import { Web3FunctionContextData } from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
import { GelatoRelay } from "@gelatonetwork/relay-sdk";
import { runWeb3Function } from "./utils";
import { providers } from "ethers";

const w3fName = "delay-dispatch";
const w3fRootDir = path.join(__dirname, "..");
const w3fPath = path.join(w3fRootDir, w3fName, "index.ts");

jest.useFakeTimers();

describe("delay-dispatch web3 function", () => {
  let context: Web3FunctionContextData;
  let sponsoredCallSpy: jest.SpyInstance;
  const provider = new providers.JsonRpcProvider(
    "https://rpc.ankr.com/eth_goerli"
  );

  beforeAll(async () => {
    const { secrets } = Web3FunctionLoader.load(w3fName, w3fRootDir);
    const { gasPrice } = await provider.getFeeData();

    if (gasPrice === null) throw new Error("gasPrice is null");

    context = {
      secrets,
      storage: {},
      gelatoArgs: {
        chainId: 5,
        gasPrice: gasPrice.toString(),
      },
      userArgs: {
        delayMod: "0x0b7a9a6f1c4e739df11f55c6879d48c9851a2162",
        gasAllowance: 10_000_000,
      },
    };
    // const relay = new GelatoRelay();
    // // console.log(GelatoRelay.prototype);
    // sponsoredCallSpy = jest
    //   .spyOn(relay, "sponsoredCall")
    //   .mockImplementation(async (params, apiKey, options) => {
    //     return { taskId: "123" };
    //   });
  });

  beforeEach(() => {
    sponsoredCallSpy.mockClear();
  });

  it("throws if the secret or a userArg is not set", async () => {
    await expect(
      runWeb3Function(w3fPath, { ...context, secrets: {} }, [provider])
    ).rejects.toHaveProperty(
      "message",
      "Fail to run web3 function: Error: Missing RELAY_API_KEY secret"
    );

    await expect(
      runWeb3Function(w3fPath, { ...context, userArgs: {} }, [provider])
    ).rejects.toHaveProperty(
      "message",
      "Fail to run web3 function: Error: Missing delayMod userArg"
    );
  });

  it("does nothing if the Delay mod does not yet exist", async () => {
    const { result } = await runWeb3Function(
      w3fPath,
      {
        ...context,
        userArgs: {
          ...context.userArgs,
          delayMod: "0x0000000000000000000000000000000000000123",
        },
      },
      [provider]
    );
    expect(result).toEqual({
      canExec: false,
      message:
        "Delay mod contract not deployed at 0x0000000000000000000000000000000000000123",
    });
  });

  it("does nothing if the Delay mod's queue is empty", async () => {
    const { result } = await runWeb3Function(
      w3fPath,
      {
        ...context,
        userArgs: {
          ...context.userArgs,
          delayMod: "0xeff5b8593076b69ff1a6c5d0e13c76c614738738",
        },
      },
      [provider]
    );
    expect(result).toEqual({
      canExec: false,
      message: "No executable transactions found",
    });
  });

  it.skip("skips over expired transactions to execute executable transactions", async () => {
    const timeFirstTxIsExpired = QUEUE[0].createdAt + COOLDOWN + EXPIRATION + 1;
    jest.setSystemTime(timeFirstTxIsExpired * 1000);

    const { result } = await runWeb3Function(w3fPath, context, [provider]);

    expect(sponsoredCallSpy).toHaveBeenCalledTimes(3);

    expect(result).toEqual({
      canExec: true,
      calls: [],
    });
  });

  it.skip("respects the gas allowance", async () => {});
});

// from query to goerli subgraph: delayModifier(id: "0x0b7a9a6f1c4e739df11f55c6879d48c9851a2162")
const QUEUE = [
  {
    nonce: 0,
    to: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    data: "0xd0e30db0",
    hash: "0xc14c1e26bdb3d7ed2d4f6278551cb54b674d02156200d417f6d0b49fc4a30b8e",
    value: "1000000000000000",
    operation: "Call",
    createdAt: 1697621808,
  },
  {
    nonce: 1,
    to: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    data: "0xd0e30db0",
    hash: "0x4a494c243e0e9999415b5e020b0437bafafb539a87390e7d29bc2a0e4dbf3907",
    value: "2000000000000000",
    operation: "Call",
    createdAt: 1697623452,
  },
  {
    nonce: 2,
    to: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    data: "0xd0e30db0",
    hash: "0x799784a52f2fba8a2468ff69def0c4a7516b3f3cf6a65d45755f0f428e237576",
    value: "3000000000000000",
    operation: "Call",
    createdAt: 1697623680,
  },
  {
    nonce: 3,
    to: "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    data: "0xd0e30db0",
    hash: "0x5dece1e1eba14e7343b304a1e01c3b62056a86b62a8655fb2ecf696efa12b7c2",
    value: "4000000000000000",
    operation: "Call",
    createdAt: 1697625900,
  },
];

// values for Delay mod at gor:0x0b7a9a6f1c4e739df11f55c6879d48c9851a2162
const COOLDOWN = 1800;
const EXPIRATION = 3600;
