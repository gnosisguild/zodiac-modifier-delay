import { task, types } from 'hardhat/config'

task('deploy', 'Deploys a Delay modifier')
  .addParam('owner', 'Address of the owner', undefined, types.string)
  .addParam(
    'avatar',
    'Address of the avatar (e.g. Safe)',
    undefined,
    types.string
  )
  .addParam('target', 'Address of the target', undefined, types.string)
  .addParam(
    'cooldown',
    'Cooldown in seconds that should be required after a oracle provided answer',
    24 * 3600,
    types.int,
    true
  )
  .addParam(
    'expiration',
    'Time duration in seconds for which a positive answer is valid. After this time the answer is expired',
    7 * 24 * 3600,
    types.int,
    true
  )
  .setAction(async (taskArgs, hre) => {
    const [deployer] = await hre.ethers.getSigners()

    const Delay = await hre.ethers.getContractFactory('Delay')
    const delay = await (
      await Delay.connect(deployer).deploy(
        taskArgs.owner,
        taskArgs.avatar,
        taskArgs.target,
        taskArgs.cooldown,
        taskArgs.expiration
      )
    ).waitForDeployment()

    const address = await delay.getAddress()

    console.log(`\x1B[32m✔ Instance deployed to: ${address} 🎉\x1B[0m `)

    if (hre.network.name == 'hardhat') {
      return
    }

    console.log('Waiting 1 minute before etherscan verification start...')
    // Etherscan needs some time to process before trying to verify.
    await new Promise((resolve) => setTimeout(resolve, 60000))

    await hre.run('verify:verify', {
      address: address,
      constructorArguments: [
        taskArgs.owner,
        taskArgs.avatar,
        taskArgs.target,
        taskArgs.cooldown,
        taskArgs.expiration,
      ],
    })
  })
