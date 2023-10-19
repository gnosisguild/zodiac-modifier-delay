import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  // roots: ["<rootDir>"],
  preset: "ts-jest/presets/js-with-ts",
  testEnvironment: "node",
  testRegex: "(/test|(\\.|/)(test|spec))\\.ts?$",
  transformIgnorePatterns: ["node_modules/(?!ky/.*)"],
};
export default config;
