module.exports = {
    skipFiles: ['test/Imports.sol', 'test/TestAvatar.sol', 'test/Mock.sol'],
    mocha: {
        grep: "@skip-on-coverage", // Find everything with this tag
        invert: true               // Run the grep's inverse set.
    }
};