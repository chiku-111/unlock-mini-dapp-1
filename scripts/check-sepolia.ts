//检查 Hardhat 能不能正确连接 Sepolia, 并确认它将使用哪个钱包部署
import { network } from "hardhat";

const { ethers } = await network.create("sepolia");

const providerNetwork = await ethers.provider.getNetwork();

const [deployer] = await ethers.getSigners();

const balance = await ethers.provider.getBalance(deployer.address);

console.log("Network name:", providerNetwork.name);

console.log("Chain ID:", providerNetwork.chainId.toString());

console.log("Deployer address:", deployer.address);

//把部署账户余额从 wei 转换成 ETH
console.log("Deployer balance:", ethers.formatEther(balance),"ETH")