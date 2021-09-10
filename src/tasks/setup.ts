import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";
import { deployAndSetUpModule } from "@gnosis.pm/zodiac";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface DelayTaskArgs {
  owner: string;
  avatar: string;
  target: string;
  cooldown: number;
  expiration: number;
  proxied: boolean;
}

const deployDelayModifier = async (
  taskArgs: DelayTaskArgs,
  hardhatRuntime: HardhatRuntimeEnvironment
) => {
  const [caller] = await hardhatRuntime.ethers.getSigners();
  console.log("Using the account:", caller.address);
  const Modifier = await hardhatRuntime.ethers.getContractFactory("Delay");

  if (taskArgs.proxied) {
    const chainId = await hardhatRuntime.getChainId();
    const { transaction } = deployAndSetUpModule(
      "delay",
      {
        values: [
          taskArgs.owner,
          taskArgs.avatar,
          taskArgs.target,
          taskArgs.cooldown,
          taskArgs.expiration,
        ],
        types: ["address", "address", "address", "uint256", "uint256"],
      },
      hardhatRuntime.ethers.provider,
      Number(chainId),
      Date.now().toString()
    );
    const deploymentTransaction = await caller.sendTransaction(transaction);
    const receipt = await deploymentTransaction.wait();
    console.log("Modifier contract deployed to", receipt.logs[1].address);
    return;
  }

  const modifier = await Modifier.deploy(
    taskArgs.owner,
    taskArgs.avatar,
    taskArgs.target,
    taskArgs.cooldown,
    taskArgs.expiration
  );

  console.log("Modifier deployed to:", modifier.address);
};

task("setup", "Deploys a Delay modifier")
  .addParam("owner", "Address of the owner", undefined, types.string)
  .addParam(
    "avatar",
    "Address of the avatar (e.g. Safe)",
    undefined,
    types.string
  )
  .addParam("target", "Address of the target", undefined, types.string)
  .addParam(
    "cooldown",
    "Cooldown in seconds that should be required after a oracle provided answer",
    24 * 3600,
    types.int,
    true
  )
  .addParam(
    "expiration",
    "Time duration in seconds for which a positive answer is valid. After this time the answer is expired",
    7 * 24 * 3600,
    types.int,
    true
  )
  .addParam(
    "proxied",
    "Deploys contract through factory",
    false,
    types.boolean,
    true
  )
  .setAction(deployDelayModifier);

task("verifyEtherscan", "Verifies the contract on etherscan")
  .addParam("modifier", "Address of the modifier", undefined, types.string)
  .addParam("owner", "Address of the owner", undefined, types.string)
  .addParam(
    "avatar",
    "Address of the avatar (e.g. Safe)",
    undefined,
    types.string
  )
  .addParam(
    "cooldown",
    "Cooldown in seconds that should be required after a oracle provided answer",
    24 * 3600,
    types.int,
    true
  )
  .addParam(
    "expiration",
    "Time duration in seconds for which a positive answer is valid. After this time the answer is expired",
    7 * 24 * 3600,
    types.int,
    true
  )
  .setAction(async (taskArgs, hardhatRuntime) => {
    await hardhatRuntime.run("verify", {
      address: taskArgs.modifier,
      constructorArgsParams: [
        taskArgs.owner,
        taskArgs.avatar,
        taskArgs.target,
        `${taskArgs.cooldown}`,
        `${taskArgs.expiration}`,
      ],
    });
  });

export {};
