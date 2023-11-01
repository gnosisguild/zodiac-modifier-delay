import { loadFixture, mine } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { AbiCoder } from 'ethers'
import hre from 'hardhat'

const ZeroState =
  '0x0000000000000000000000000000000000000000000000000000000000000000'
const ZeroAddress = '0x0000000000000000000000000000000000000000'
const FirstAddress = '0x0000000000000000000000000000000000000001'

describe.only('DelayModifier', async () => {
  const cooldown = 180
  const expiration = 180 * 1000

  async function setup() {
    const Avatar = await hre.ethers.getContractFactory('TestAvatar')
    const avatar = await Avatar.deploy()
    const avatarAddress = await avatar.getAddress()

    const Modifier = await hre.ethers.getContractFactory('Delay')
    const modifier = await Modifier.deploy(
      avatarAddress,
      avatarAddress,
      avatarAddress,
      cooldown,
      expiration
    )

    return { avatar, modifier }
  }

  describe('setUp()', async () => {
    it('throws if not enough time between txCooldown and txExpiration', async () => {
      const Module = await hre.ethers.getContractFactory('Delay')
      await expect(
        Module.deploy(ZeroAddress, FirstAddress, FirstAddress, 1, 59)
      ).to.be.revertedWith('Expiration must be 0 or at least 60 seconds')
    })

    it('throws if avatar is zero address', async () => {
      const Module = await hre.ethers.getContractFactory('Delay')
      await expect(
        Module.deploy(ZeroAddress, ZeroAddress, FirstAddress, 1, 0)
      ).to.be.revertedWith('Avatar can not be zero address')
    })

    it('throws if target is zero address', async () => {
      const Module = await hre.ethers.getContractFactory('Delay')
      await expect(
        Module.deploy(ZeroAddress, FirstAddress, ZeroAddress, 1, 0)
      ).to.be.revertedWith('Target can not be zero address')
    })

    it('txExpiration can be 0', async () => {
      const [user1] = await hre.ethers.getSigners()
      const Module = await hre.ethers.getContractFactory('Delay')
      await Module.deploy(user1.address, user1.address, user1.address, 1, 0)
    })

    it('should emit event because of successful set up', async () => {
      const [user1] = await hre.ethers.getSigners()
      const Delay = await hre.ethers.getContractFactory('Delay')
      expect(
        await Delay.deploy(user1.address, user1.address, user1.address, 1, 0)
      )
        .to.emit(Delay, 'DelaySetup')
        .withArgs(user1.address, user1.address, user1.address, 1, 0)
    })
  })

  describe('disableModule()', async () => {
    it('throws if not authorized', async () => {
      const [user1] = await hre.ethers.getSigners()
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
      const [user1] = await hre.ethers.getSigners()
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
      const [user1] = await hre.ethers.getSigners()
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

  describe('enableModule()', async () => {
    it('throws if not authorized', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { modifier } = await loadFixture(setup)

      await expect(modifier.enableModule(user1.address))
        .to.be.revertedWithCustomError(modifier, 'OwnableUnauthorizedAccount')
        .withArgs(user1.address)
    })

    it('throws because module is already enabled', async () => {
      const [user1] = await hre.ethers.getSigners()
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
      const [user1] = await hre.ethers.getSigners()
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

  describe('setTxCooldown()', async () => {
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
  })

  describe('setTxExpiration()', async () => {
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
  })

  describe('setTxNonce()', async () => {
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
      await expect(avatar.exec(await modifier.getAddress(), 0, tx.data))

      await expect(
        avatar.exec(await modifier.getAddress(), 0, tx2.data)
      ).to.be.revertedWith('New nonce must be higher than current txNonce')
    })

    it('throws if nonce is more than queueNonce + 1.', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      const tx2 = await modifier.setTxNonce.populateTransaction(42)
      await expect(avatar.exec(await modifier.getAddress(), 0, tx.data))
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)

      await expect(
        avatar.exec(await modifier.getAddress(), 0, tx2.data)
      ).to.be.revertedWith('Cannot be higher than queueNonce')
    })

    it('sets nonce', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)

      const tx1 = await modifier.enableModule.populateTransaction(user1.address)
      const tx2 = await modifier.setTxNonce.populateTransaction(1)

      expect(await modifier.txNonce()).to.be.equals(0)
      await avatar.exec(await modifier.getAddress(), 0, tx1.data)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      expect(await avatar.exec(await modifier.getAddress(), 0, tx2.data))
      expect(await modifier.txNonce()).to.be.equals(1)
    })
  })

  describe('execTransactionFromModule()', async () => {
    it('throws if not authorized', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { modifier } = await loadFixture(setup)
      await expect(
        modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      ).to.be.revertedWithCustomError(modifier, 'NotAuthorized')
    })

    it('increments queueNonce', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      expect(await modifier.queueNonce()).to.be.equals(0)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      await expect(await modifier.queueNonce()).to.be.equals(1)
    })

    it('sets txHash', async () => {
      const [user1] = await hre.ethers.getSigners()
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
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)

      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await expect(await modifier.getTxCreatedAt(0)).to.be.equals(0)
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)

      const block = await hre.network.provider.send('eth_getBlockByNumber', [
        'latest',
        false,
      ])

      await expect(block.timestamp).to.be.equals(
        await modifier.getTxCreatedAt(0)
      )
    })

    it('emits transaction details', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)
      const expectedQueueNonce = await modifier.queueNonce

      await expect(
        modifier.execTransactionFromModule(user1.address, 42, '0x', 0)
      )
        .to.emit(modifier, 'TransactionAdded')
        .withArgs(
          expectedQueueNonce,
          await modifier.getTransactionHash(user1.address, 42, '0x', 0),
          user1.address,
          42,
          '0x',
          0
        )
    })
  })

  describe('execTransactionFromModuleReturnData()', async () => {
    it('throws if not authorized', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { modifier } = await loadFixture(setup)

      await expect(
        modifier.execTransactionFromModuleReturnData(user1.address, 0, '0x', 0)
      ).to.be.revertedWithCustomError(modifier, 'NotAuthorized')
    })

    it('increments queueNonce', async () => {
      const [user1] = await hre.ethers.getSigners()
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
      const [user1] = await hre.ethers.getSigners()
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
      const [user1] = await hre.ethers.getSigners()
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

      const block = await hre.network.provider.send('eth_getBlockByNumber', [
        'latest',
        false,
      ])

      await expect(block.timestamp).to.be.equals(
        await modifier.getTxCreatedAt(0)
      )
    })

    it('emits transaction details', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)
      const expectedQueueNonce = await modifier.queueNonce()

      expect(
        await modifier.execTransactionFromModuleReturnData(
          user1.address,
          42,
          '0x',
          0
        )
      )
        .to.emit(modifier, 'TransactionAdded')
        .withArgs(
          expectedQueueNonce,
          await modifier.getTransactionHash(user1.address, 42, '0x', 0),
          user1.address,
          42,
          '0x',
          0
        )
    })

    it('returns ABI encoded nonce, hash, and timestamp', async () => {
      const [user1] = await hre.ethers.getSigners()
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

  describe('executeNextTx()', async () => {
    it('throws if there is nothing in queue', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await expect(
        modifier.executeNextTx(user1.address, 42, '0x', 0)
      ).to.be.revertedWith('Transaction queue is empty')
    })

    it('throws if cooldown has not passed', async () => {
      const [user1] = await hre.ethers.getSigners()
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
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      await hre.network.provider.send('evm_setNextBlockTimestamp', [4242424242])
      await expect(
        modifier.executeNextTx(user1.address, 0, '0x', 0)
      ).to.be.revertedWith('Transaction expired')
    })

    it('throws if transaction hashes do not match', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)

      // enable the module
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      mine
      const block = await hre.network.provider.send('eth_getBlockByNumber', [
        'latest',
        false,
      ])
      const timestamp = parseInt(block.timestamp) + cooldown
      await hre.network.provider.send('evm_setNextBlockTimestamp', [timestamp])
      await expect(
        modifier.executeNextTx(user1.address, 1, '0x', 0)
      ).to.be.revertedWith('Transaction hashes do not match')
    })

    it('throws if transaction module transaction throws', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      await modifier.execTransactionFromModule(user1.address, 1, '0x', 0)
      const block = await hre.network.provider.send('eth_getBlockByNumber', [
        'latest',
        false,
      ])
      const timestamp = parseInt(block.timestamp) + cooldown
      await hre.network.provider.send('evm_setNextBlockTimestamp', [timestamp])
      await expect(
        modifier.executeNextTx(user1.address, 1, '0x', 0)
      ).to.be.revertedWith('Module transaction failed')
    })

    it('executes transaction', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      const block = await hre.network.provider.send('eth_getBlockByNumber', [
        'latest',
        false,
      ])
      const timestamp = parseInt(block.timestamp) + 100
      await hre.network.provider.send('evm_setNextBlockTimestamp', [timestamp])
      await expect(modifier.executeNextTx(user1.address, 0, '0x', 0))
    })
  })

  describe('skipExpired()', async () => {
    it('should skip to the next nonce that has not yet expired', async () => {
      const [user1] = await hre.ethers.getSigners()
      const { avatar, modifier } = await loadFixture(setup)
      const tx = await modifier.enableModule.populateTransaction(user1.address)
      await avatar.exec(await modifier.getAddress(), 0, tx.data)

      await avatar.setModule(await modifier.getAddress())
      for (let i = 0; i < 3; i++) {
        await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      }
      let block = await hre.network.provider.send('eth_getBlockByNumber', [
        'latest',
        false,
      ])
      const timestamp = parseInt(block.timestamp) + 424242
      await hre.network.provider.send('evm_setNextBlockTimestamp', [timestamp])

      await expect(
        modifier.executeNextTx(user1.address, 0, '0x', 0)
      ).to.be.revertedWith('Transaction expired')

      for (let i = 0; i < 2; i++) {
        await modifier.execTransactionFromModule(user1.address, 0, '0x', 0)
      }
      await modifier.skipExpired()
      await expect(await modifier.txNonce()).to.be.equals(3)
      await expect(await modifier.queueNonce()).to.be.equals(5)

      await expect(modifier.executeNextTx(user1.address, 0, '0x', 0)).to.be
        .reverted

      block = await hre.network.provider.send('eth_getBlockByNumber', [
        'latest',
        false,
      ])

      await hre.network.provider.send('evm_setNextBlockTimestamp', [
        parseInt(block.timestamp) + cooldown,
      ])

      await expect(modifier.executeNextTx(user1.address, 0, '0x', 0)).to.not.be
        .reverted
    })
  })
})
