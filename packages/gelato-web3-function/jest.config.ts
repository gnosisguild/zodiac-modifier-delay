import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  roots: ["<rootDir>"],
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: "(/test|(\\.|/)(test|spec))\\.ts?$",
};
export default config;
