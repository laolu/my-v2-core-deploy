const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function verify(contractAddress, args) {
  console.log("开始验证合约...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
      contract: "contracts/UniswapV2Factory.sol:UniswapV2Factory"
    });
    console.log("合约验证成功！");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("合约已经验证过了");
    } else {
      console.error("验证失败:", error);
      console.error("错误详情:", error.message);
    }
  }
}

async function saveDeployment(deploymentInfo) {
  const deploymentsDir = path.join(__dirname, '../deployments');
  
  // 确保deployments目录存在
  if (!fs.existsSync(deploymentsDir)){
    fs.mkdirSync(deploymentsDir);
  }

  const network = hre.network.name;
  const filename = path.join(deploymentsDir, `${network}.json`);

  // 如果文件存在，读取现有内容
  let existing = {};
  if (fs.existsSync(filename)) {
    existing = JSON.parse(fs.readFileSync(filename, 'utf8'));
  }

  // 合并新的部署信息
  const updated = { ...existing, ...deploymentInfo };

  // 写入文件
  fs.writeFileSync(
    filename,
    JSON.stringify(updated, null, 2)
  );
  console.log(`部署信息已保存到: ${filename}`);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("部署网络:", hre.network.name);
  console.log("使用账户地址部署:", deployer.address);
  
  // 获取账户余额
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(balance), "ETH");

  // 部署 Factory
  const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy(deployer.address);
  
  // 等待部署完成
  console.log("等待部署完成...");
  await factory.waitForDeployment();
  
  // 等待额外的区块确认
  console.log("等待额外的区块确认...");
  const deployTx = factory.deploymentTransaction();
  await deployTx.wait(5);
  console.log("已确认额外的区块");
  
  const factoryAddress = await factory.getAddress();
  console.log("UniswapV2Factory 部署到地址:", factoryAddress);

  // 保存部署信息
  await saveDeployment({
    UniswapV2Factory: {
      address: factoryAddress,
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      constructorArgs: [deployer.address]
    }
  });

  // 如果不是在本地网络，则进行验证
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    await verify(factoryAddress, [deployer.address]);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 