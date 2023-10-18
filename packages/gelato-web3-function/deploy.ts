import path from "path";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";

const main = async () => {
  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");

  const web3FunctionPath = path.join("delay-dispatch", "index.ts");
  const cid = await Web3FunctionBuilder.deploy(web3FunctionPath);
  console.log(`Web3Function IPFS CID: ${cid}`);
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
