import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";
import { Contract } from "ethers";
import { AbiCoder } from "ethers/lib/utils";

const FirstAddress = "0x0000000000000000000000000000000000000001";

task("setup", "Deploys a Delay modifier")
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
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);
    const Modifier = await hardhatRuntime.ethers.getContractFactory("Delay");
    const modifier = await Modifier.deploy(
      taskArgs.owner,
      taskArgs.avatar,
      taskArgs.cooldown,
      taskArgs.expiration
    );

    console.log("Modifier deployed to:", modifier.address);
  });

task("factorySetup", "Deploys a Delay modifier through a proxy")
  .addParam("factory", "Address of the Proxy Factory", undefined, types.string)
  .addParam(
    "mastercopy",
    "Address of the Delay Modifier Master Copy",
    undefined,
    types.string
  )
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
    const [caller] = await hardhatRuntime.ethers.getSigners();
    console.log("Using the account:", caller.address);

    const FactoryAbi = [
      `function deployModule(
                   address masterCopy,
                   bytes memory initializer
             ) public returns (address clone)`
    ];

    const Factory = new Contract(taskArgs.factory, FactoryAbi, caller);
    const Modifier = await hardhatRuntime.ethers.getContractFactory("Delay");

    const encodedParams = new AbiCoder().encode(
      ["address", "address", "uint256", "uint256"],
      [taskArgs.owner, taskArgs.avatar, taskArgs.cooldown, taskArgs.expiration]
    );
    const initParams = Modifier.interface.encodeFunctionData("setUp", [
      encodedParams
    ]);
    const receipt = await Factory.deployModule(
      taskArgs.mastercopy,
      initParams
    ).then((tx: any) => tx.wait(3));
    console.log("Modifier deployed to:", receipt.logs[1].address);
  });

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
        `${taskArgs.cooldown}`,
        `${taskArgs.expiration}`
      ]
    });
  });

export {};
