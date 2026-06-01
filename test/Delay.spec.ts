import { expect } from 'chai'
import { AbiCoder, hexlify, randomBytes } from 'ethers'
import hre from 'hardhat'

const { ethers, provider, networkHelpers } = await hre.network.create()
const { loadFixture } = networkHelpers

type RpcBlock = { timestamp: string }

async function latestBlock() {
  return (await provider.request({
    method: 'eth_getBlockByNumber',
    params: ['latest', false],
  })) as RpcBlock
}

async function setNextBlockTimestamp(timestamp: number) {
  await provider.request({
    method: 'evm_setNextBlockTimestamp',
    params: [timestamp],
  })
}

const ZeroState =
  '0x0000000000000000000000000000000000000000000000000000000000000000'
const ZeroAddress = '0x0000000000000000000000000000000000000000'
const FirstAddress = '0x0000000000000000000000000000000000000001'

describe('DelayModifier', () => {
  const cooldown = 180
  const expiration = 180 * 1000

  async function setup() {
    const Avatar = await ethers.getContractFactory('TestAvatar')
    const avatar = await Avatar.deploy()
    const avatarAddress = await avatar.getAddress()

    const Modifier = await ethers.getContractFactory('Delay')
    const modifier = await Modifier.deploy(
      avatarAddress,
      avatarAddress,
      avatarAddress,
      cooldown,
      expiration
    )

    return { avatar, modifier }
  }

  describe('setUp()', () => {
    it('throws if not enough time between txCooldown and txExpiration', async () => {
      const Module = await ethers.getContractFactory('Delay')
      await expect(
        Module.deploy(ZeroAddress, FirstAddress, FirstAddress, 1, 59)
      ).to.be.revertedWith('Expiration must be 0 or at least 60 seconds')
    })

    it('throws if avatar is zero address', async () => {
      const Module = await ethers.getContractFactory('Delay')
      await expect(
        Module.deploy(ZeroAddress, ZeroAddress, FirstAddress, 1, 0)
      ).to.be.revertedWith('Avatar can not be zero address')
    })

    it('throws if target is zero address', async () => {
      const Module = await ethers.getContractFactory('Delay')
      await expect(
        Module.deploy(ZeroAddress, FirstAddress, ZeroAddress, 1, 0)
      ).to.be.revertedWith('Target can not be zero address')
    })

    it('txExpiration can be 0', async () => {
      const [user1] = await ethers.getSigners()
      const Module = await ethers.getContractFactory('Delay')
      await Module.deploy(user1.address, user1.address, user1.address, 1, 0)
    })

    it('should emit event because of successful set up', async () => {
      const [user1] = await ethers.getSigners()
      const Delay = await ethers.getContractFactory('Delay')
      const delay = await Delay.deploy(
        user1.address,
        user1.address,
        user1.address,
        1,
        0
      )
      await expect(delay.deploymentTransaction())
        .to.emit(delay, 'DelaySetup')
        .withArgs(user1.address, user1.address, user1.address, user1.address)
    })
  })

  describe('disableModule()', () => {
    it.skip('throws if not authorized', async () => {
      const [user1] = await ethers.getSigners()
      const { modifier } = await loadFixture(setup)

      await expect(modifier.disableModule(FirstAddress, user1.address))
        .to.be.revertedWithCustomError(modifier, 'OwnableUnauthorizedAccount')
        .withArgs('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    })

    it('throws if module is null or sentinel', async () => {
      const { avatar, modifier } = await loadFixture(setup)
      const disable = await modifier.disableModule.populateTransaction(
        FirstAddress,
        FirstAddress
      )

      await expect(
        avatar.exec(await modifier.getAddress(), 0, disable.data)
      ).to.be.revertedWithCustomError(modifier, 'InvalidModule')
    })

    it('throws if module is not added ', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const disable = await modifier.disableModule.populateTransaction(
        ZeroAddress,
        user1.address
      )

      await expect(
        avatar.exec(await modifier.getAddress(), 0, disable.data)
      ).to.be.revertedWithCustomError(modifier, 'AlreadyDisabledModule')
    })

    it('disables a module()', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const enable = await modifier.enableModule.populateTransaction(
        user1.address
      )
      const disable = await modifier.disableModule.populateTransaction(
        FirstAddress,
        user1.address
      )

      await avatar.exec(await modifier.getAddress(), 0, enable.data)
      await expect(await modifier.isModuleEnabled(user1.address)).to.be.equals(
        true
      )
      await avatar.exec(await modifier.getAddress(), 0, disable.data)
      await expect(await modifier.isModuleEnabled(user1.address)).to.be.equals(
        false
      )
    })
  })

  describe('enableModule()', () => {
    it('throws if not authorized', async () => {
      const [user1] = await ethers.getSigners()
      const { modifier } = await loadFixture(setup)

      await expect(modifier.enableModule(user1.address))
        .to.be.revertedWithCustomError(modifier, 'OwnableUnauthorizedAccount')
        .withArgs(user1.address)
    })

    it('throws because module is already enabled', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const enable = await modifier.enableModule.populateTransaction(
        user1.address
      )

      await avatar.exec(await modifier.getAddress(), 0, enable.data)

      await expect(avatar.exec(await modifier.getAddress(), 0, enable.data))
        .to.be.revertedWithCustomError(modifier, 'AlreadyEnabledModule')
        .withArgs(user1.address)
    })

    it('throws because module is invalid ', async () => {
      const { avatar, modifier } = await loadFixture(setup)
      const enable =
        await modifier.enableModule.populateTransaction(FirstAddress)

      await expect(
        avatar.exec(await modifier.getAddress(), 0, enable.data)
      ).to.be.revertedWithCustomError(modifier, 'InvalidModule')
    })

    it('enables a module', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const enable = await modifier.enableModule.populateTransaction(
        user1.address
      )

      await avatar.exec(await modifier.getAddress(), 0, enable.data)
      await expect(await modifier.isModuleEnabled(user1.address)).to.be.equals(
        true
      )
      await expect(
        await modifier.getModulesPaginated(FirstAddress, 10)
      ).to.be.deep.equal([[user1.address], FirstAddress])
    })
  })

  describe('setTxCooldown()', () => {
    it('throws if not authorized', async () => {
      const { modifier } = await loadFixture(setup)

      await expect(modifier.setTxCooldown(42)).to.be.revertedWithCustomError(
        modifier,
        'OwnableUnauthorizedAccount'
      )
    })

    it('sets cooldown', async () => {
      const { avatar, modifier } = await loadFixture(setup)

      const prevCooldown = 180
      const nextCooldown = 43
      const tx = await modifier.setTxCooldown.populateTransaction(
        BigInt(nextCooldown)
      )

      expect(await modifier.txCooldown()).to.equal(prevCooldown)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)
      expect(await modifier.txCooldown()).to.equal(nextCooldown)
    })

    it('emits event SetTxCooldown', async () => {
      const { avatar, modifier } = await loadFixture(setup)

      const nextCooldown = 43
      const tx = await modifier.setTxCooldown.populateTransaction(
        BigInt(nextCooldown)
      )

      await expect(await avatar.exec(await modifier.getAddress(), 0, tx.data))
        .to.emit(modifier, 'TxCooldownSet')
        .withArgs(nextCooldown)
    })
  })

  describe('setTxExpiration()', () => {
    it('throws if not authorized', async () => {
      const { modifier } = await loadFixture(setup)
      await expect(modifier.setTxExpiration(42)).to.be.revertedWithCustomError(
        modifier,
        'OwnableUnauthorizedAccount'
      )
    })

    it('throws if expiration is less than 60 seconds.', async () => {
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.setTxExpiration.populateTransaction(59)

      await expect(
        avatar.exec(await modifier.getAddress(), 0, tx.data)
      ).to.be.revertedWith('Expiration must be 0 or at least 60 seconds')
    })

    it('sets expiration', async () => {
      const { avatar, modifier } = await loadFixture(setup)

      const nextExpiration = 180000
      const tx =
        await modifier.setTxExpiration.populateTransaction(nextExpiration)

      await expect(await modifier.txExpiration()).to.be.equals(expiration)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await expect(await modifier.txExpiration()).to.be.equals(nextExpiration)
    })

    it('it emits event TxExpirationSet', async () => {
      const { avatar, modifier } = await loadFixture(setup)

      const nextExpiration = 180000
      const tx =
        await modifier.setTxExpiration.populateTransaction(nextExpiration)

      await expect(await avatar.exec(await modifier.getAddress(), 0, tx.data))
        .to.emit(modifier, 'TxExpirationSet')
        .withArgs(nextExpiration)
    })
  })

  describe('setTxNonce()', () => {
    it('throws if not authorized', async () => {
      const { modifier } = await loadFixture(setup)
      await expect(modifier.setTxNonce(42)).to.be.revertedWithCustomError(
        modifier,
        'OwnableUnauthorizedAccount'
      )
    })

    it('throws if nonce is less than current nonce.', async () => {
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.setTxExpiration.populateTransaction(60)
      const tx2 = await modifier.setTxNonce.populateTransaction(0)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await expect(
        avatar.exec(await modifier.getAddress(), 0, tx2.data)
      ).to.be.revertedWith('New nonce must be higher than current txNonce')
    })

    it('throws if nonce is more than queueNonce + 1.', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      const tx2 = await modifier.setTxNonce.populateTransaction(42)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)

      await expect(
        avatar.exec(await modifier.getAddress(), 0, tx2.data)
      ).to.be.revertedWith('Cannot be higher than queueNonce')
    })

    it('sets nonce', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)

      const tx1 = await modifier.enableModule.populateTransaction(user1.address)
      const tx2 = await modifier.setTxNonce.populateTransaction(1)

      expect(await modifier.txNonce()).to.be.equals(0)
      await avatar.exec(await modifier.getAddress(), 0, tx1.data)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      await avatar.exec(await modifier.getAddress(), 0, tx2.data)
      expect(await modifier.txNonce()).to.be.equals(1)
    })

    it('it emits TxNonceSet', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)

      const tx1 = await modifier.enableModule.populateTransaction(user1.address)
      const tx2 = await modifier.setTxNonce.populateTransaction(1)

      expect(await modifier.txNonce()).to.be.equals(0)
      await avatar.exec(await modifier.getAddress(), 0, tx1.data)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)

      await expect(await avatar.exec(await modifier.getAddress(), 0, tx2.data))
        .to.emit(modifier, 'TxNonceSet')
        .withArgs(1)
    })
  })

  describe('execTransactionFromModule()', () => {
    it('throws if not authorized', async () => {
      const [user1] = await ethers.getSigners()
      const { modifier } = await loadFixture(setup)
      await expect(
        modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      ).to.be.revertedWithCustomError(modifier, 'NotAuthorized')
    })

    it('increments queueNonce', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      expect(await modifier.queueNonce()).to.be.equals(0)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      await expect(await modifier.queueNonce()).to.be.equals(1)
    })

    it('sets txHash', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      const txHash = await modifier.getTransactionHash(
        user1.address,
        0,
        '0x',
        0
      )

      await expect(await modifier.getTxHash(0)).to.be.equals(ZeroState)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      await expect(await modifier.getTxHash(0)).to.be.equals(txHash)
    })

    it('sets txCreatedAt', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)

      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await expect(await modifier.getTxCreatedAt(0)).to.be.equals(0)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)

      const block = await latestBlock()

      await expect(block.timestamp).to.be.equals(
        await modifier.getTxCreatedAt(0)
      )
    })

    it('emits transaction details', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)
      const expectedQueueNonce = (await modifier.queueNonce()).toString()

      const txHash = await modifier.getTransactionHash(
        user1.address,
        42,
        '0x',
        0
      )

      await expect(
        modifier.execTransactionFromModule(user1.address, 42, '0x', 0)
      )
        .to.emit(modifier, 'TransactionAdded')
        .withArgs(expectedQueueNonce, txHash, user1.address, 42, '0x', 0)
    })
  })

  describe('execTransactionWithSignature()', () => {
    it('allows any relayer with an enabled module signature', async () => {
      const [module, relayer, to] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(module.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      const moduleTx = {
        to: to.address,
        value: 42,
        data: '0x',
        operation: 0,
      }
      const salt = hexlify(randomBytes(32))
      const { chainId } = await ethers.provider.getNetwork()
      const signature = await module.signTypedData(
        { chainId, verifyingContract: await modifier.getAddress() },
        {
          ModuleTx: [
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' },
            { name: 'operation', type: 'uint8' },
            { name: 'salt', type: 'bytes32' },
          ],
        },
        { ...moduleTx, salt }
      )
      const expectedQueueNonce = await modifier.queueNonce()
      const expectedHash = await modifier.getTransactionHash(
        moduleTx.to,
        moduleTx.value,
        moduleTx.data,
        moduleTx.operation
      )

      await expect(
        (modifier.connect(relayer) as any).execTransactionWithSignature(
          moduleTx.to,
          moduleTx.value,
          moduleTx.data,
          moduleTx.operation,
          salt,
          signature
        )
      )
        .to.emit(modifier, 'TransactionAdded')
        .withArgs(
          expectedQueueNonce,
          expectedHash,
          moduleTx.to,
          moduleTx.value,
          moduleTx.data,
          moduleTx.operation
        )

      expect(await modifier.queueNonce()).to.equal(1)
      expect(await modifier.getTxHash(0)).to.equal(expectedHash)
    })
  })

  describe('execTransactionFromModuleReturnData()', () => {
    it('throws if not authorized', async () => {
      const [user1] = await ethers.getSigners()
      const { modifier } = await loadFixture(setup)

      await expect(
        modifier.execTransactionFromModuleReturnData(user1.address, 0, '0x', 0)
      ).to.be.revertedWithCustomError(modifier, 'NotAuthorized')
    })

    it('increments queueNonce', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await expect(await modifier.queueNonce()).to.be.equals(0)
      await modifier.execTransactionFromModuleReturnData(
        user1.address,
        0,
        '0x',
        0
      )
      await expect(await modifier.queueNonce()).to.be.equals(1)
    })

    it('sets txHash', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      const txHash = await modifier.getTransactionHash(
        user1.address,
        0,
        '0x',
        0
      )

      await expect(await modifier.getTxHash(0)).to.be.equals(ZeroState)
      await modifier.execTransactionFromModuleReturnData(
        user1.address,
        0,
        '0x',
        0
      )
      await expect(await modifier.getTxHash(0)).to.be.equals(txHash)
    })

    it('sets txCreatedAt', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await expect(await modifier.getTxCreatedAt(0)).to.be.equals('0x00')
      await modifier.execTransactionFromModuleReturnData(
        user1.address,
        0,
        '0x',
        0
      )

      const block = await latestBlock()

      await expect(block.timestamp).to.be.equals(
        await modifier.getTxCreatedAt(0)
      )
    })

    it('emits transaction details', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      const expectedQueueNonce = await modifier.queueNonce()
      const transactionHash = await modifier.getTransactionHash(
        user1.address,
        42,
        '0x',
        0
      )

      await expect(
        modifier.execTransactionFromModule(user1.address, 42, '0x', 0)
      )
        .to.emit(modifier, 'TransactionAdded')
        .withArgs(
          expectedQueueNonce,
          transactionHash,
          user1.address,
          42,
          '0x',
          0
        )
    })

    it('returns ABI encoded nonce, hash, and timestamp', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)
      const expectedQueueNonce = await modifier.queueNonce()
      const expectedHash = await modifier.getTransactionHash(
        user1.address,
        42,
        '0xbadfed',
        0
      )

      const { returnData } =
        await modifier.execTransactionFromModuleReturnData.staticCall(
          user1.address,
          42,
          '0xbadfed',
          0
        )

      const decodedData = await AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'bytes32', 'uint256'],
        returnData
      )
      expect(decodedData[0]).to.equal(expectedQueueNonce)
      expect(decodedData[1]).to.equal(expectedHash)
    })
  })

  describe('executeNextTx()', () => {
    it('throws if there is nothing in queue', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await expect(
        modifier.executeNextTx(user1.address, 42, '0x', 0)
      ).to.be.revertedWith('Transaction queue is empty')
    })

    it('throws if cooldown has not passed', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      let tx = await modifier.setTxCooldown.populateTransaction(42)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await modifier.execTransactionFromModule(user1.address, 42, '0x', 0)
      await expect(
        modifier.executeNextTx(user1.address, 42, '0x', 0)
      ).to.be.revertedWith('Transaction is still in cooldown')
    })

    it('throws if transaction has expired', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      await setNextBlockTimestamp(4242424242)
      await expect(
        modifier.executeNextTx(user1.address, 0, '0x', 0)
      ).to.be.revertedWith('Transaction expired')
    })

    it('throws if transaction hashes do not match', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)

      // enable the module
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      const block = await latestBlock()
      const timestamp = parseInt(block.timestamp) + cooldown
      await setNextBlockTimestamp(timestamp)
      await expect(
        modifier.executeNextTx(user1.address, 1, '0x', 0)
      ).to.be.revertedWith('Transaction hashes do not match')
    })

    it('throws if transaction module transaction throws', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      await modifier.execTransactionFromModule(user1.address, 1, '0x', 0)
      const block = await latestBlock()
      const timestamp = parseInt(block.timestamp) + cooldown
      await setNextBlockTimestamp(timestamp)
      await expect(
        modifier.executeNextTx(user1.address, 1, '0x', 0)
      ).to.be.revertedWith('Module transaction failed')
    })

    it('executes transaction', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      const block = await latestBlock()
      const timestamp = parseInt(block.timestamp) + cooldown
      await setNextBlockTimestamp(timestamp)
      await modifier.executeNextTx(user1.address, 0, '0x', 0)
    })
  })

  describe('skipExpired()', () => {
    it('should skip to the next nonce that has not yet expired', async () => {
      const [user1] = await ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      for (let i = 0; i < 3; i++) {
        await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      }
      let block = await latestBlock()
      const timestamp = parseInt(block.timestamp) + 424242
      await setNextBlockTimestamp(timestamp)

      await expect(
        modifier.executeNextTx(user1.address, 0, '0x', 0)
      ).to.be.revertedWith('Transaction expired')

      for (let i = 0; i < 2; i++) {
        await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      }
      await modifier.skipExpired()
      await expect(await modifier.txNonce()).to.be.equals(3)
      await expect(await modifier.queueNonce()).to.be.equals(5)

      await expect(
        modifier.executeNextTx(user1.address, 0, '0x', 0)
      ).to.be.revert(ethers)

      block = await latestBlock()

      await setNextBlockTimestamp(parseInt(block.timestamp) + cooldown)

      await expect(
        modifier.executeNextTx(user1.address, 0, '0x', 0)
      ).to.not.be.revert(ethers)
    })
  })
})
