//MembershipLock 部署到一个区块链网络上, 打印出合约地址
//前端会用这个地址调用, hasValidMembership(account)
import { network } from "hardhat";

//同步写文件, 同步创建目录
import { writeFileSync, mkdirSync } from "node:fs";

//join = Node.js 里的路径拼接函数
import { join } from "node:path";

//如果命令行指定了 DEPLOY_NETWORK, 就用指定的网络
const networkName = process.env.DEPLOY_NETWORK ??  "localhost";

const { ethers } = await network.create(networkName);

const membershipLock = await ethers.deployContract("MembershipLock");

//等待合约部署完成
await membershipLock.waitForDeployment();

//getAddress() 返回部署后的合约地址
const membershipLockAddress = await membershipLock.getAddress();

//问当前连接的区块链：是哪条链
const providerNetwork = await ethers.provider.getNetwork();
const chainId = Number(providerNetwork.chainId);

const deployment = {
    chainId: chainId,
    network: networkName,
    membershipLock: membershipLockAddress,
    deployedAt: new Date().toISOString(),
};

//部署文件夹路径 = frontend/src/deployments
const deploymentsDir = join("frontend", "src", "deployments");

//最终要写入的文件路径
const deploymentPath = join(deploymentsDir, `${chainId}.json`);

//创建 deploymentsDir 这个文件夹; 如果它已经存在，就不要报错; 如果中间路径不存在，也一起创建
mkdirSync(deploymentsDir, { recursive: true});

//把内容写到指定文件里, JSON.stringify(...)把 js 对象变成 JSON 字符串
writeFileSync(
    deploymentPath,
    `${JSON.stringify(deployment, null, 2)}\n`
)


console.log("Network:", networkName);
console.log("ChainId:", chainId);
console.log("MembershipLock deployed to:", membershipLockAddress);
console.log("Deployment written to:", deploymentPath);

