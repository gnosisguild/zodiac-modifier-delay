// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0;

import {Operation, Modifier} from "@gnosis-guild/zodiac-core/contracts/core/Modifier.sol";

contract Delay is Modifier {
    event DelaySetup(
        address indexed initiator,
        address indexed owner,
        address indexed avatar,
        address target
    );
    event TxCooldownSet(uint256 cooldown);
    event TxExpirationSet(uint256 expiration);
    event TxNonceSet(uint256 nonce);
    event TransactionAdded(
        uint256 indexed queueNonce,
        bytes32 indexed txHash,
        address to,
        uint256 value,
        bytes data,
        Operation operation
    );

    uint256 public txCooldown;
    uint256 public txExpiration;
    uint256 public txNonce;
    uint256 public queueNonce;
    // Mapping of queue nonce to transaction hash.
    mapping(uint256 => bytes32) public txHash;
    // Mapping of queue nonce to creation timestamp.
    mapping(uint256 => uint256) public txCreatedAt;

    /// @param _owner Address of the owner
    /// @param _avatar Address of the avatar (e.g. a Gnosis Safe)
    /// @param _target Address of the contract that will call exec function
    /// @param _cooldown Cooldown in seconds that should be required after a transaction is proposed
    /// @param _expiration Duration that a proposed transaction is valid for after the cooldown, in seconds (or 0 if valid forever)
    /// @notice There need to be at least 60 seconds between end of cooldown and expiration
    constructor(
        address _owner,
        address _avatar,
        address _target,
        uint256 _cooldown,
        uint256 _expiration
    ) {
        bytes memory initParams = abi.encode(
            _owner,
            _avatar,
            _target,
            _cooldown,
            _expiration
        );
        setUp(initParams);
    }

    function setUp(bytes memory initParams) public override initializer {
        (
            address _owner,
            address _avatar,
            address _target,
            uint256 _cooldown,
            uint256 _expiration
        ) = abi.decode(
                initParams,
                (address, address, address, uint256, uint256)
            );
        require(_avatar != address(0), "Avatar can not be zero address");
        require(_target != address(0), "Target can not be zero address");
        require(
            _expiration == 0 || _expiration >= 60,
            "Expiration must be 0 or at least 60 seconds"
        );

        _transferOwnership(_owner);
        avatar = _avatar;
        target = _target;
        txExpiration = _expiration;
        txCooldown = _cooldown;
        setupModules();

        emit DelaySetup(msg.sender, _owner, _avatar, _target);
        emit AvatarSet(address(0), _avatar);
        emit TargetSet(address(0), _target);
    }

    /// @dev Sets the cooldown before a transaction can be executed.
    /// @param _txCooldown Cooldown in seconds that should be required before the transaction can be executed
    /// @notice This can only be called by the owner
    function setTxCooldown(uint256 _txCooldown) public onlyOwner {
        txCooldown = _txCooldown;
        emit TxCooldownSet(_txCooldown);
    }

    /// @dev Sets the duration for which a transaction is valid.
    /// @param _txExpiration Duration that a transaction is valid in seconds (or 0 if valid forever) after the cooldown
    /// @notice There need to be at least 60 seconds between end of cooldown and expiration
    /// @notice This can only be called by the owner
    function setTxExpiration(uint256 _txExpiration) public onlyOwner {
        require(
            _txExpiration == 0 || _txExpiration >= 60,
            "Expiration must be 0 or at least 60 seconds"
        );
        txExpiration = _txExpiration;
        emit TxExpirationSet(_txExpiration);
    }

    /// @dev Sets transaction nonce. Used to invalidate or skip transactions in queue.
    /// @param _txNonce New transaction nonce
    /// @notice This can only be called by the owner
    function setTxNonce(uint256 _txNonce) public onlyOwner {
        require(
            _txNonce > txNonce,
            "New nonce must be higher than current txNonce"
        );
        require(_txNonce <= queueNonce, "Cannot be higher than queueNonce");
        txNonce = _txNonce;
        emit TxNonceSet(_txNonce);
    }

    /// @dev Adds a transaction to the queue (same as avatar interface so that this can be placed between other modules and the avatar).
    /// @param to Destination address of module transaction
    /// @param value Ether value of module transaction
    /// @param data Data payload of module transaction
    /// @param operation Operation type of module transaction
    /// @return success Whether or not the call was successfully queued for execution
    /// @notice Can only be called by enabled modules
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation
    ) public override moduleOnly returns (bool success) {
        bytes32 hash = getTransactionHash(to, value, data, operation);
        txHash[queueNonce] = hash;
        txCreatedAt[queueNonce] = block.timestamp;
        emit TransactionAdded(queueNonce, hash, to, value, data, operation);
        queueNonce++;
        success = true;
    }

    /// @dev Adds a transaction to the queue (same as avatar interface so that this can be placed between other modules and the avatar).
    /// @param to Destination address of module transaction
    /// @param value Ether value of module transaction
    /// @param data Data payload of module transaction
    /// @param operation Operation type of module transaction
    /// @return success Whether or not the call was successfully queued for execution
    /// @return returnData ABI encoded queue nonce (uint256), transaction hash (bytes32), and block.timestamp (uint256)
    /// @notice Can only be called by enabled modules
    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation
    )
        public
        override
        moduleOnly
        returns (bool success, bytes memory returnData)
    {
        bytes32 hash = getTransactionHash(to, value, data, operation);
        txHash[queueNonce] = hash;
        txCreatedAt[queueNonce] = block.timestamp;
        emit TransactionAdded(queueNonce, hash, to, value, data, operation);
        success = true;
        returnData = abi.encode(queueNonce, hash, block.timestamp);
        queueNonce++;
    }

    /// @dev Executes the next transaction only if the cooldown has passed and the transaction has not expired
    /// @param to Destination address of module transaction
    /// @param value Ether value of module transaction
    /// @param data Data payload of module transaction
    /// @param operation Operation type of module transaction
    /// @notice The txIndex used by this function is always 0
    function executeNextTx(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation
    ) public {
        require(txNonce < queueNonce, "Transaction queue is empty");
        uint256 txCreationTimestamp = txCreatedAt[txNonce];
        require(
            block.timestamp - txCreationTimestamp >= txCooldown,
            "Transaction is still in cooldown"
        );
        if (txExpiration != 0) {
            require(
                txCreationTimestamp + txCooldown + txExpiration >=
                    block.timestamp,
                "Transaction expired"
            );
        }
        require(
            txHash[txNonce] == getTransactionHash(to, value, data, operation),
            "Transaction hashes do not match"
        );
        txNonce++;
        require(exec(to, value, data, operation), "Module transaction failed");
    }

    function skipExpired() public {
        while (
            txExpiration != 0 &&
            txCreatedAt[txNonce] + txCooldown + txExpiration <
            block.timestamp &&
            txNonce < queueNonce
        ) {
            txNonce++;
        }
    }

    function getTransactionHash(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(to, value, data, operation));
    }

    function getTxHash(uint256 _nonce) public view returns (bytes32) {
        return (txHash[_nonce]);
    }

    function getTxCreatedAt(uint256 _nonce) public view returns (uint256) {
        return (txCreatedAt[_nonce]);
    }
}
