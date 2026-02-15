const hre = require("hardhat");
const fs = require("fs");

async function deployContract() {
  console.log("=".repeat(60));
  console.log("🚀 CaseManagementSystem Deployment");
  console.log("=".repeat(60));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n📡 Deploying with account: ${deployer.address}`);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // Deployment configuration
  const config = {
    gasPrice: await getOptimalGasPrice(),
    gasLimit: 3000000, // Adjust based on your contract size
  };

  // Deploy contract
  const CaseManagementSystem = await hre.ethers.getContractFactory("CaseManagementSystem");
  console.log("📦 Deploying CaseManagementSystem...");
  
  const caseManagement = await CaseManagementSystem.deploy();

  await caseManagement.waitForDeployment();
  const contractAddress = await caseManagement.getAddress();
  const deployTx = caseManagement.deploymentTransaction();

  console.log(`\n✅ Contract deployed at: ${contractAddress}`);
  console.log(`🔗 Transaction hash: ${deployTx.hash}`);

  // Get owner
  const owner = await caseManagement.owner();
  console.log(`👑 Contract owner: ${owner}`);

  // Save deployment info
  await saveDeploymentInfo({
    contract: "CaseManagementSystem",
    address: contractAddress,
    deployer: deployer.address,
    owner: owner,
    network: hre.network.name,
    transactionHash: deployTx.hash,
    timestamp: new Date().toISOString(),
  });

  return { contract: caseManagement, address: contractAddress };
}

async function getOptimalGasPrice() {
  try {
    const feeData = await hre.ethers.provider.getFeeData();
    return feeData.gasPrice;
  } catch (error) {
    console.log("⚠️ Could not fetch gas price, using default");
    return undefined;
  }
}

async function saveDeploymentInfo(info) {
  // Ensure deployments directory exists
  if (!fs.existsSync("deployments")) {
    fs.mkdirSync("deployments");
  }

  // Save by network
  const networkPath = `deployments/${info.network}.json`;
  fs.writeFileSync(networkPath, JSON.stringify(info, null, 2));
  console.log(`\n📝 Deployment info saved to: ${networkPath}`);

  // Update latest deployment
  const latestPath = "deployments/latest.json";
  fs.writeFileSync(latestPath, JSON.stringify(info, null, 2));
  console.log(`📝 Latest deployment info saved to: ${latestPath}`);

  // Export for frontend
  const frontendPath = "../frontend/src/contracts/deployment.json";
  try {
    fs.writeFileSync(frontendPath, JSON.stringify(info, null, 2));
    console.log(`📝 Frontend deployment info saved to: ${frontendPath}`);
  } catch (error) {
    console.log("⚠️ Could not save frontend deployment info (frontend directory may not exist)");
  }
}

async function verifyContract(address) {
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    
    // Wait for 5 confirmations
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds delay
    
    console.log("📄 Verifying contract on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Contract already verified!");
      } else {
        console.log("❌ Verification failed:", error.message);
      }
    }
  }
}

async function main() {
  try {
    const { address } = await deployContract();
    // await verifyContract(address);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Deployment completed successfully!",address);
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main();