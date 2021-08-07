import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task, types } from "hardhat/config";
import { Contract } from "ethers";

const FirstAddress = "0x0000000000000000000000000000000000000001";

task("setup", "Deploys a SafeDelay module")
    .addParam("owner", "Address of the owner", undefined, types.string)
    .addParam("executor", "Address of the executor (e.g. Safe)", undefined, types.string)
    .addParam("cooldown", "Cooldown in seconds that should be required after a oracle provided answer", 24 * 3600, types.int, true)
    .addParam("expiration", "Time duration in seconds for which a positive answer is valid. After this time the answer is expired", 7 * 24 * 3600, types.int, true)
    .setAction(async (taskArgs, hardhatRuntime) => {
        const [caller] = await hardhatRuntime.ethers.getSigners();
        console.log("Using the account:", caller.address);
        const Module = await hardhatRuntime.ethers.getContractFactory("DelayModule");
        const module = await Module.deploy(taskArgs.owner, taskArgs.executor, taskArgs.cooldown, taskArgs.expiration);

        console.log("Module deployed to:", module.address);
    });

task("factory-setup", "Deploys a SafeDelay module through a proxy")
    .addParam("factory", "Address of the Proxy Factory", undefined, types.string)
    .addParam("mastercopy", "Address of the Delay Module Master Copy", undefined, types.string)
    .addParam("owner", "Address of the owner", undefined, types.string)
    .addParam("executor", "Address of the executor (e.g. Safe)", undefined, types.string)
    .addParam("cooldown", "Cooldown in seconds that should be required after a oracle provided answer", 24 * 3600, types.int, true)
    .addParam("expiration", "Time duration in seconds for which a positive answer is valid. After this time the answer is expired", 7 * 24 * 3600, types.int, true)
    .setAction(async (taskArgs, hardhatRuntime) => {
        const [caller] = await hardhatRuntime.ethers.getSigners();
        console.log("Using the account:", caller.address);

        const FactoryAbi = [
            `function deployModule(
                   address masterCopy, 
                   bytes memory initializer
             ) public returns (address clone)`,
         ];
         
         const Factory = new Contract(taskArgs.factory, FactoryAbi, caller)
         const Module = await hardhatRuntime.ethers.getContractFactory("DelayModule");
         
         const initParams = Module.interface.encodeFunctionData('setUp', [
            taskArgs.owner,
            taskArgs.executor, 
            taskArgs.cooldown,
            taskArgs.expiration,
        ])

        const receipt = await Factory.deployModule(taskArgs.mastercopy, initParams).then((tx: any) => tx.wait(3));
        console.log("Module deployed to:", receipt.logs[1].address);

    });

task("verifyEtherscan", "Verifies the contract on etherscan")
    .addParam("module", "Address of the module", undefined, types.string)
    .addParam("owner", "Address of the owner", undefined, types.string)
    .addParam("executor", "Address of the executor (e.g. Safe)", undefined, types.string)
    .addParam("cooldown", "Cooldown in seconds that should be required after a oracle provided answer", 24 * 3600, types.int, true)
    .addParam("expiration", "Time duration in seconds for which a positive answer is valid. After this time the answer is expired", 7 * 24 * 3600, types.int, true)
    .setAction(async (taskArgs, hardhatRuntime) => {
        await hardhatRuntime.run("verify", {
            address: taskArgs.module,
            constructorArgsParams: [
                taskArgs.owner, taskArgs.executor, `${taskArgs.cooldown}`, `${taskArgs.expiration}`
            ]
        })
    });


task("deployMasterCopy", "deploy a master copy of Delay Module").setAction(
    async (_, hardhatRuntime) => {
        const [caller] = await hardhatRuntime.ethers.getSigners();
        console.log("Using the account:", caller.address);
        const Module = await hardhatRuntime.ethers.getContractFactory("DelayModule");
        const module = await Module.deploy(FirstAddress, FirstAddress, 0, 0);
    
        await module.deployTransaction.wait(3);
    
        console.log("Module deployed to:", module.address);
        await hardhatRuntime.run("verify:verify", {
            address: module.address,
            constructorArguments: [FirstAddress, FirstAddress, 0, 0]
        });
    }
);

export { };
