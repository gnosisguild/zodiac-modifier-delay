import { expect } from 'chai'
import { AbiCoder, keccak256, toUtf8Bytes } from 'ethers'
import hre from 'hardhat'

const { ethers, networkHelpers } = await hre.network.create()
const { loadFixture } = networkHelpers

const AddressOne = '0x0000000000000000000000000000000000000001'

describe('Module works with factory', () => {
  const cooldown = 100
  const expiration = 180
  const paramsTypes = ['address', 'address', 'address', 'uint256', 'uint256']

  async function setup() {
    const Factory = await ethers.getContractFactory('TestFactory')
    const factory = await Factory.deploy()

    const Delay = await ethers.getContractFactory('Delay')

    const masterCopy = await Delay.deploy(
      AddressOne,
      AddressOne,
      AddressOne,
      0,
      0
    )

    const encodedParams = AbiCoder.defaultAbiCoder().encode(paramsTypes, [
      AddressOne,
      AddressOne,
      AddressOne,
      cooldown,
      expiration,
    ])

    return { factory, masterCopy, encodedParams }
  }

  it('should throw because master copy is already initialized', async () => {
    const { masterCopy, encodedParams } = await loadFixture(setup)

    await expect(masterCopy.setUp(encodedParams)).to.be.revertedWithCustomError(
      masterCopy,
      'AlreadyInitialized'
    )
  })

  it('should deploy new amb module proxy', async () => {
    const { factory, masterCopy } = await loadFixture(setup)
    const [owner, avatar, target] = await ethers.getSigners()
    const paramsValues = [
      owner.address,
      avatar.address,
      target.address,
      100,
      180,
    ]
    const setupParams = AbiCoder.defaultAbiCoder().encode(
      paramsTypes,
      paramsValues
    )
    const initializer = masterCopy.interface.encodeFunctionData('setUp', [
      setupParams,
    ])
    const receipt = await (
      await factory.deployModule(masterCopy, initializer, 0)
    ).wait()

    const eventAsTopic = keccak256(
      toUtf8Bytes('ModuleProxyCreation(address,address)')
    )

    const entry = receipt?.logs.find(
      (entry: { topics: readonly string[] }) =>
        entry.topics.length > 0 && entry.topics[0] == eventAsTopic
    )

    const [newProxyAddress] = AbiCoder.defaultAbiCoder().decode(
      ['address'],
      entry?.topics[1] as string
    )

    const delay = await ethers.getContractAt('Delay', newProxyAddress)
    expect(await delay.txCooldown()).to.be.eq(cooldown)
    expect(await delay.txExpiration()).to.be.eq(expiration)
  })
})
