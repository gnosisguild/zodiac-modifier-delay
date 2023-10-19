import {
  Web3FunctionContext,
  Web3FunctionResult,
} from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
import { providers } from "ethers";
import path from "path";

let taskFn: (ctx: Web3FunctionContext) => Promise<Web3FunctionResult>;
jest.mock("@gelatonetwork/web3-functions-sdk", () => ({
  Web3Function: {
    onRun: jest.fn().mockImplementation((fn) => {
      taskFn = fn;
    }),
  },
}));

import "../delay-dispatch";

export const runWeb3Function = async ({
  userArgs,
  secrets: secretsOverride,
  provider,
}: {
  userArgs;
  secrets?: {
    [key: string]: string;
  };
  provider: providers.JsonRpcProvider;
}) => {
  if (!taskFn) {
    throw new Error("taskFn not defined");
  }

  const { secrets: envSecrets } = Web3FunctionLoader.load(
    "delay-dispatch",
    path.join(__dirname, "..")
  );
  const { gasPrice } = await provider.getFeeData();

  if (gasPrice === null) throw new Error("gasPrice is null");

  const secrets = secretsOverride || envSecrets;

  const storage: { [key: string]: string | undefined } = {};

  return await taskFn({
    gelatoArgs: { chainId: 5, gasPrice },
    userArgs,
    secrets: { get: async (key: string) => secrets[key] },
    multiChainProvider: { default: () => provider } as any,
    storage: {
      get: async (key: string) => storage[key],
      set: async (key: string, value: string) => {
        storage[key] = value;
      },
      delete: async (key: string) => {
        delete storage[key];
      },
    },
  });
};
