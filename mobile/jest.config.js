// jest.config.js
module.exports = {
  // Other values
  testEnvironment: "@shopify/react-native-skia/jestEnv.js",
  setupFilesAfterEnv: [
    "@shopify/react-native-skia/jestSetup.js",
  ],
};