import { expect } from "chai";
import hre, { deployments, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { AbiCoder } from "ethers/lib/utils";

const ZeroState =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZeroAddress = "0x0000000000000000000000000000000000000000";
const FirstAddress = "0x0000000000000000000000000000000000000001";

describe("DelayModifier", async () => {
  let initializeParams: string;

  const baseSetup = deployments.createFixture(async () => {
    await deployments.fixture();
    const Executor = await hre.ethers.getContractFactory("TestExecutor");
    const executor = await Executor.deploy();
    const Mock = await hre.ethers.getContractFactory("MockContract");
    const mock = await Mock.deploy();

    initializeParams = new AbiCoder().encode(
      ["address", "address", "uint256", "uint256"],
      [executor.address, executor.address, 0, "0x1337"]
    );

    return { Executor, executor, module, mock };
  });

  const setupTestWithTestExecutor = deployments.createFixture(async () => {
    const base = await baseSetup();
    const Module = await hre.ethers.getContractFactory("Delay");
    const module = await Module.deploy(ZeroAddress, ZeroAddress, 0, "0x1337");
    await module.setUp(initializeParams);
    return { ...base, Module, module };
  });

  const [user1] = waffle.provider.getWallets();

  describe("setUp()", async () => {
    it("throws if not enough time between txCooldown and txExpiration", async () => {
      const Module = await hre.ethers.getContractFactory("Delay");
      await expect(
        Module.deploy(ZeroAddress, ZeroAddress, 1, 59)
      ).to.be.revertedWith("Expiratition must be 0 or at least 60 seconds");
    });

    it("txExpiration can be 0", async () => {
      const Module = await hre.ethers.getContractFactory("Delay");
      await Module.deploy(user1.address, user1.address, 1, 0);
    });

    it("throws if module has already been initialized", async () => {
      await baseSetup()
      const Module = await hre.ethers.getContractFactory("Delay");
      const module = await Module.deploy(user1.address, user1.address, 1, 0);
      await expect(
        module.setUp(initializeParams)
      ).to.be.revertedWith("Modifier is already initialized");
    });
  });

  describe("disableModule()", async () => {
    it("throws if not authorized", async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(
        module.disableModule(FirstAddress, user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("throws if module is null or sentinel", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const disable = await module.populateTransaction.disableModule(
        FirstAddress,
        FirstAddress
      );
      await expect(
        executor.exec(module.address, 0, disable.data)
      ).to.be.revertedWith("Invalid module");
    });

    it("throws if module is not added ", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const disable = await module.populateTransaction.disableModule(
        ZeroAddress,
        user1.address
      );
      await expect(
        executor.exec(module.address, 0, disable.data)
      ).to.be.revertedWith("Module already disabled");
    });

    it("disables a module()", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const enable = await module.populateTransaction.enableModule(
        user1.address
      );
      const disable = await module.populateTransaction.disableModule(
        FirstAddress,
        user1.address
      );

      await executor.exec(module.address, 0, enable.data);
      await expect(await module.isModuleEnabled(user1.address)).to.be.equals(
        true
      );
      await executor.exec(module.address, 0, disable.data);
      await expect(await module.isModuleEnabled(user1.address)).to.be.equals(
        false
      );
    });
  });

  describe("enableModule()", async () => {
    it("throws if not authorized", async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(module.enableModule(user1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("throws because module is already enabled", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const enable = await module.populateTransaction.enableModule(
        user1.address
      );

      await executor.exec(module.address, 0, enable.data);
      await expect(
        executor.exec(module.address, 0, enable.data)
      ).to.be.revertedWith("Module already enabled");
    });

    it("throws because module is invalid ", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const enable = await module.populateTransaction.enableModule(
        FirstAddress
      );

      await expect(
        executor.exec(module.address, 0, enable.data)
      ).to.be.revertedWith("Invalid module");
    });

    it("enables a module", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const enable = await module.populateTransaction.enableModule(
        user1.address
      );

      await executor.exec(module.address, 0, enable.data);
      await expect(await module.isModuleEnabled(user1.address)).to.be.equals(
        true
      );
      await expect(
        await module.getModulesPaginated(FirstAddress, 10)
      ).to.be.deep.equal([[user1.address], FirstAddress]);
    });
  });

  describe("setTxCooldown()", async () => {
    it("throws if not authorized", async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(module.setTxCooldown(42)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("sets cooldown", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.setTxCooldown(43);
      let cooldown = await module.txCooldown();

      await expect(cooldown._hex).to.be.equals("0x00");
      await executor.exec(module.address, 0, tx.data);
      cooldown = await module.txCooldown();
      await expect(cooldown._hex).to.be.equals("0x2b");
    });
  });

  describe("setTxExpiration()", async () => {
    it("throws if not authorized", async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(module.setTxExpiration(42)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("thows if expiration is less than 60 seconds.", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.setTxExpiration(59);

      await expect(
        executor.exec(module.address, 0, tx.data)
      ).to.be.revertedWith("Expiratition must be 0 or at least 60 seconds");
    });

    it("sets expiration", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.setTxExpiration("0x031337");
      let expiration = await module.txExpiration();

      await expect(expiration._hex).to.be.equals("0x1337");
      await executor.exec(module.address, 0, tx.data);
      expiration = await module.txExpiration();
      await expect(expiration._hex).to.be.equals("0x031337");
    });
  });

  describe("setTxNonce()", async () => {
    it("throws if not authorized", async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(module.setTxNonce(42)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("thows if nonce is less than current nonce.", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.setTxExpiration(60);
      const tx2 = await module.populateTransaction.setTxNonce(0);
      await expect(executor.exec(module.address, 0, tx.data));

      await expect(
        executor.exec(module.address, 0, tx2.data)
      ).to.be.revertedWith("New nonce must be higher than current txNonce");
    });

    it("thows if nonce is more than queueNonce + 1.", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      const tx2 = await module.populateTransaction.setTxNonce(42);
      await expect(executor.exec(module.address, 0, tx.data));
      await module.execTransactionFromModule(user1.address, 0, "0x", 0);

      await expect(
        executor.exec(module.address, 0, tx2.data)
      ).to.be.revertedWith("Cannot be higher than queueNonce");
    });

    it("sets nonce", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      const tx2 = await module.populateTransaction.setTxNonce(1);
      let txNonce = await module.txNonce();

      await expect(txNonce._hex).to.be.equals("0x00");
      await executor.exec(module.address, 0, tx.data);
      await module.execTransactionFromModule(user1.address, 0, "0x", 0);
      await expect(executor.exec(module.address, 0, tx2.data));
      txNonce = await module.txNonce();
      await expect(txNonce._hex).to.be.equals("0x01");
    });
  });

  describe("execTransactionFromModule()", async () => {
    it("throws if not authorized", async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(
        module.execTransactionFromModule(user1.address, 0, "0x", 0)
      ).to.be.revertedWith("Module not authorized");
    });

    it("increments queueNonce", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);
      let queueNonce = await module.queueNonce();

      await expect(queueNonce._hex).to.be.equals("0x00");
      await module.execTransactionFromModule(user1.address, 0, "0x", 0);
      queueNonce = await module.queueNonce();
      await expect(queueNonce._hex).to.be.equals("0x01");
    });

    it("sets txHash", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);

      let txHash = await module.getTransactionHash(user1.address, 0, "0x", 0);

      await expect(await module.getTxHash(0)).to.be.equals(ZeroState);
      await module.execTransactionFromModule(user1.address, 0, "0x", 0);
      await expect(await module.getTxHash(0)).to.be.equals(txHash);
    });

    it("sets txCreatedAt", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      let expectedTimestamp = await module.getTxCreatedAt(0);
      await executor.exec(module.address, 0, tx.data);

      await expect(expectedTimestamp._hex).to.be.equals("0x00");
      let receipt = await module.execTransactionFromModule(
        user1.address,
        0,
        "0x",
        0
      );
      let blockNumber = receipt.blockNumber;

      let block = await hre.network.provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);

      expectedTimestamp = await module.getTxCreatedAt(0);
      await expect(block.timestamp).to.be.equals(expectedTimestamp._hex);
    });

    it("emits transaction details", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);
      const expectedQueueNonce = await module.queueNonce;

      await expect(module.execTransactionFromModule(user1.address, 42, "0x", 0))
        .to.emit(module, "TransactionAdded")
        .withArgs(
          expectedQueueNonce,
          await module.getTransactionHash(user1.address, 42, "0x", 0),
          user1.address,
          42,
          "0x",
          0
        );
    });
  });

  describe("executeNextTx()", async () => {
    it("throws if there is nothing in queue", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);

      await expect(
        module.executeNextTx(user1.address, 42, "0x", 0)
      ).to.be.revertedWith("Transaction queue is empty");
    });

    it("throws if cooldown has not passed", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      let tx = await module.populateTransaction.setTxCooldown(42);
      await executor.exec(module.address, 0, tx.data);

      tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);

      await module.execTransactionFromModule(user1.address, 42, "0x", 0);
      await expect(
        module.executeNextTx(user1.address, 42, "0x", 0)
      ).to.be.revertedWith("Transaction is still in cooldown");
    });

    it("throws if transaction has expired", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);

      await executor.setModule(module.address);
      await module.execTransactionFromModule(user1.address, 0, "0x", 0);
      let expiry = await module.txCreatedAt(0);
      await hre.network.provider.send("evm_setNextBlockTimestamp", [
        4242424242,
      ]);
      await expect(
        module.executeNextTx(user1.address, 0, "0x", 0)
      ).to.be.revertedWith("Transaction expired");
    });

    it("throws if transaction hashes do not match", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);

      await executor.setModule(module.address);
      await module.execTransactionFromModule(user1.address, 0, "0x", 0);
      let block = await hre.network.provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);
      let timestamp = parseInt(block.timestamp) + 100;
      await hre.network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
      await expect(
        module.executeNextTx(user1.address, 1, "0x", 0)
      ).to.be.revertedWith("Transaction hashes do not match");
    });

    it("throws if transaction module transaction throws", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);

      await executor.setModule(module.address);
      await module.execTransactionFromModule(user1.address, 1, "0x", 0);
      let block = await hre.network.provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);
      let timestamp = parseInt(block.timestamp) + 100;
      await hre.network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
      await expect(
        module.executeNextTx(user1.address, 1, "0x", 0)
      ).to.be.revertedWith("Module transaction failed");
    });

    it("executes transaction", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);

      await executor.setModule(module.address);
      await module.execTransactionFromModule(user1.address, 0, "0x", 0);
      let block = await hre.network.provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);
      let timestamp = parseInt(block.timestamp) + 100;
      await hre.network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
      await expect(module.executeNextTx(user1.address, 0, "0x", 0));
    });
  });

  describe("skipExpired()", async () => {
    it("should skip to the next nonce that has not yet expired", async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address, 0, tx.data);

      await executor.setModule(module.address);
      for (let i = 0; i < 3; i++) {
        await module.execTransactionFromModule(user1.address, 0, "0x", 0);
      }
      let block = await hre.network.provider.send("eth_getBlockByNumber", [
        "latest",
        false,
      ]);
      let timestamp = parseInt(block.timestamp) + 424242;
      await hre.network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
      await expect(
        module.executeNextTx(user1.address, 0, "0x", 0)
      ).to.be.revertedWith("Transaction expired");
      for (let i = 0; i < 2; i++) {
        await module.execTransactionFromModule(user1.address, 0, "0x", 0);
      }
      await expect(module.skipExpired());
      let txNonce = await module.txNonce();
      let queueNonce = await module.queueNonce();
      await expect(parseInt(txNonce._hex)).to.be.equals(3);
      await expect(parseInt(queueNonce._hex)).to.be.equals(5);
      await expect(module.executeNextTx(user1.address, 0, "0x", 0));
    });
  });
});
