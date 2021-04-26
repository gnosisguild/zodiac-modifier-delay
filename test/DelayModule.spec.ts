import { expect } from "chai";
import hre, { deployments, ethers, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";

const ZERO_STATE = "0x0000000000000000000000000000000000000000000000000000000000000000";

describe("DelayModule", async () => {

  const baseSetup = deployments.createFixture(async () => {
    await deployments.fixture();
    const Executor = await hre.ethers.getContractFactory("TestExecutor");
    const executor = await Executor.deploy();
    const Mock = await hre.ethers.getContractFactory("MockContract");
    const mock = await Mock.deploy();
    return { Executor, executor, module, mock };
  })

  const setupTestWithTestExecutor = deployments.createFixture(async () => {
    const base = await baseSetup();
    const Module = await hre.ethers.getContractFactory("DelayModule");
    const module = await Module.deploy(base.executor.address, 42, "0x1337");
    return { ...base, Module, module };
  })

  const [user1] = waffle.provider.getWallets();

  describe("constructor()", async () => {
    it("throws if cooldown is 0", async () => {
      const Module = await hre.ethers.getContractFactory("DelayModule")
      await expect(
          Module.deploy(user1.address, 0, 0)
      ).to.be.revertedWith("Cooldown must to be greater than 0")
    })

    it("throws if not enough time between txCooldown and txExpiration", async () => {
      const Module = await hre.ethers.getContractFactory("DelayModule")
      await expect(
          Module.deploy(user1.address, 1, 59)
      ).to.be.revertedWith("Expiratition must be 0 or at least 60 seconds")
    })

    it("txExpiration can be 0", async () => {
      const Module = await hre.ethers.getContractFactory("DelayModule")
      await Module.deploy(user1.address, 1, 0)
    })
  })

  describe('disableModule()', async () => {
    it('throws if not authorized', async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(
          module.disableModule(user1.address)
      ).to.be.revertedWith("Not authorized");
    });

    it('disables a module()', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const enable = await module.populateTransaction.enableModule(user1.address);
      const disable = await module.populateTransaction.disableModule(user1.address);

      await executor.exec(module.address,0,enable.data);
      await expect(await module.getModuleStatus(user1.address)).to.be.equals(true);
      await executor.exec(module.address,0,disable.data);
      await expect(await module.getModuleStatus(user1.address)).to.be.equals(false);
    });
  });

  describe('enableModule()', async () => {
    it('throws if not authorized', async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(
          module.enableModule(user1.address)
      ).to.be.revertedWith("Not authorized");
    });

    it('enables a module', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const enable = await module.populateTransaction.enableModule(user1.address);

      await executor.exec(module.address,0,enable.data);
      await expect(await module.getModuleStatus(user1.address)).to.be.equals(true);
    });
  });

  describe('setTxCooldown()', async () => {
    it('throws if not authorized', async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(
          module.setTxCooldown(42)
      ).to.be.revertedWith("Not authorized");
    });

    it('sets cooldown', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.setTxCooldown(43);
      let cooldown = await module.txCooldown();

      await expect(cooldown._hex).to.be.equals("0x2a");
      await executor.exec(module.address,0,tx.data)
      cooldown = await module.txCooldown();
      await expect(cooldown._hex).to.be.equals("0x2b");
    });
  });

  describe('setTxExpiration()', async () => {
    it('throws if not authorized', async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(
          module.setTxExpiration(42)
      ).to.be.revertedWith("Not authorized");
    });

    it('thows if expiration is less than 60 seconds.', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.setTxExpiration(59);

      await expect(
        executor.exec(module.address,0,tx.data)
      ).to.be.revertedWith("Expiratition must be 0 or at least 60 seconds");
    });

    it('sets expiration', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.setTxExpiration("0x031337");
      let expiration = await module.txExpiration();

      await expect(expiration._hex).to.be.equals("0x1337");
      await executor.exec(module.address,0,tx.data)
      expiration = await module.txExpiration();
      await expect(expiration._hex).to.be.equals("0x031337");
    });

  });

  describe('setTxNonce()', async () => {
    it('throws if not authorized', async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(
          module.setTxNonce(42)
      ).to.be.revertedWith("Not authorized");
    });

    it('thows if nonce is less than current nonce.', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.setTxExpiration(60);
      const tx2 = await module.populateTransaction.setTxNonce(0);
      await expect(executor.exec(module.address,0,tx.data));

      await expect(
        executor.exec(module.address,0,tx2.data)
      ).to.be.revertedWith("New nonce must be higher than current txNonce");
    });


    it('thows if nonce is more than queueNonce + 1.', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      const tx2 = await module.populateTransaction.setTxNonce(42);
      await expect(executor.exec(module.address,0,tx.data));
      await module.execTransactionFromModule(user1.address,0,"0x",0);

      await expect(
        executor.exec(module.address,0,tx2.data)
      ).to.be.revertedWith("Cannot be higher than queueNonce");
    });

    it('sets nonce', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      const tx2 = await module.populateTransaction.setTxNonce(1);
      let txNonce = await module.txNonce();

      await expect(txNonce._hex).to.be.equals("0x00");
      await executor.exec(module.address,0,tx.data);
      await module.execTransactionFromModule(user1.address,0,"0x",0);
      await expect(executor.exec(module.address,0,tx2.data));
      txNonce = await module.txNonce();
      await expect(txNonce._hex).to.be.equals("0x01");
    });
  });

  describe('execTransactionFromModule()', async () => {
    it('throws if not authorized', async () => {
      const { module } = await setupTestWithTestExecutor();
      await expect(
          module.execTransactionFromModule(user1.address,0,"0x",0)
      ).to.be.revertedWith("Module not authorized");
    });

    it('increments queueNonce', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);
      let queueNonce = await module.queueNonce();

      await expect(queueNonce._hex).to.be.equals("0x00");
      await module.execTransactionFromModule(user1.address,0,"0x",0)
      queueNonce = await module.queueNonce();
      await expect(queueNonce._hex).to.be.equals("0x01");
    });

    it('sets txHash', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);

      let txHash = await module.getTransactionHash(user1.address,0,"0x",0);

      await expect(await module.getTxHash(0)).to.be.equals(ZERO_STATE);
      await module.execTransactionFromModule(user1.address,0,"0x",0)
      await expect(await module.getTxHash(0)).to.be.equals(txHash);
    });

    it('sets txCreatedAt', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      let expectedTimestamp = await module.getTxCreatedAt(0);
      await executor.exec(module.address,0,tx.data);

      await expect(expectedTimestamp._hex).to.be.equals("0x00");
      let receipt = await module.execTransactionFromModule(user1.address,0,"0x",0);
      let blockNumber = receipt.blockNumber;

      let block = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);

      expectedTimestamp = await module.getTxCreatedAt(0);
      await expect(block.timestamp).to.be.equals(expectedTimestamp._hex);
    });

    it('emits transaction details', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);
      const expectedQueueNonce = await module.queueNonce;

      await expect(module.execTransactionFromModule(user1.address,42,"0x",0))
        .to.emit(module, 'TransactionAdded')
        .withArgs(
          expectedQueueNonce,
          await module.getTransactionHash(user1.address,42,"0x",0),
          user1.address,
          42,
          "0x",
          0
        );
    });
  });

  describe('executeNextTx()', async () => {
    it('throws if there is nothing in queue', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);

      await expect(module.executeNextTx(user1.address,42,"0x",0))
        .to.be.revertedWith("Transaction queue is empty");
    });

    it('throws if cooldown has not passed', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);

      await module.execTransactionFromModule(user1.address,42,"0x",0);
      await expect(module.executeNextTx(user1.address,42,"0x",0))
        .to.be.revertedWith("Transaction is still in cooldown");
    });

    it('throws if transaction has expired', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);

      await executor.setModule(module.address);
      await module.execTransactionFromModule(user1.address,0,"0x",0);
      let expiry = await module.txCreatedAt(0);
      await hre.network.provider.send("evm_setNextBlockTimestamp", [4242424242]);
      await expect(module.executeNextTx(user1.address,0,"0x",0))
        .to.be.revertedWith("Transaction expired");
    });

    it('throws if transaction hashes do not match', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);

      await executor.setModule(module.address);
      await module.execTransactionFromModule(user1.address,0,"0x",0);
      let block = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      let timestamp = parseInt(block.timestamp) + 100;
      await hre.network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
      await expect(module.executeNextTx(user1.address,1,"0x",0))
        .to.be.revertedWith("Transaction hashes do not match");
    });

    it('throws if transaction module transaction throws', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);

      await executor.setModule(module.address);
      await module.execTransactionFromModule(user1.address,1,"0x",0);
      let block = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      let timestamp = parseInt(block.timestamp) + 100;
      await hre.network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
      await expect(module.executeNextTx(user1.address,1,"0x",0))
        .to.be.revertedWith("Module transaction failed");
    });

    it('executes transaction', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);

      await executor.setModule(module.address);
      await module.execTransactionFromModule(user1.address,0,"0x",0);
      let block = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      let timestamp = parseInt(block.timestamp) + 100;
      await hre.network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
      await expect(module.executeNextTx(user1.address,0,"0x",0));
    });
  });

  describe('skipExpired()', async () => {
    it('should skip to the next nonce that has not yet expired', async () => {
      const { executor, module } = await setupTestWithTestExecutor();
      const tx = await module.populateTransaction.enableModule(user1.address);
      await executor.exec(module.address,0,tx.data);

      await executor.setModule(module.address);
      for (let i = 0; i < 3; i++) {
        await module.execTransactionFromModule(user1.address,0,"0x",0);
      }
      let block = await hre.network.provider.send("eth_getBlockByNumber", ["latest", false]);
      let timestamp = parseInt(block.timestamp) + 424242;
      await hre.network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
      await expect(module.executeNextTx(user1.address,0,"0x",0))
        .to.be.revertedWith("Transaction expired");
      for (let i = 0; i < 2; i++) {
        await module.execTransactionFromModule(user1.address,0,"0x",0);
      }
      await expect(module.skipExpired());
      let txNonce = await module.txNonce();
      let queueNonce = await module.queueNonce();
      await expect(parseInt(txNonce._hex)).to.be.equals(3);
      await expect(parseInt(queueNonce._hex)).to.be.equals(5);
      await expect(module.executeNextTx(user1.address,0,"0x",0));
    });
  });

})
