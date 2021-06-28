// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0;

import "../DelayModule.sol";

contract DelayModuleMock is DelayModule {
    constructor() DelayModule() {
        isInitialized = false;
    }
}
