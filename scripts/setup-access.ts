import { network } from "hardhat";

//同步读取文件内容, 读取json
import { readFileSync } from "node:fs";
//作用: 安全拼接路径
import { join } from "node:path";

const networkName = process.env.DEPLOY_NETWORK ?? "localhost";

const { ethers } = await network.create(networkName);

//根据当前连接的网络, 找到对应的合约地址
const providerNetwork = await ethers.provider.getNetwork();
const chainId = Number(providerNetwork.chainId);

const deploymentPath = join(
    "frontend",
    "src",
    "deployments",
    `${chainId}.json`
);

//JSON字符串转换为js对象
const deployment = JSON.parse(readFileSync(deploymentPath, "utf8")) as {
    chainId: number;
    network: string;
    membershipLock: string;
    deployedAt: string;
};

const membershipLockAddress = deployment.membershipLock;

const targetUser = process.env.TARGET_USER;

if (targetUser === undefined) {
    throw new Error("Missing TARGET_USER environment variable");
}

//连接一个已经部署好的合约
const membershipLock = await ethers.getContractAt(
    "MembershipLock",
    membershipLockAddress
);

const operatorRole = await membershipLock.OPERATOR_ROLE();

console.log("Adding target user to ACL...");
const addToAclTx = await membershipLock.addToAcl(targetUser);
//等待交易被链确认
await addToAclTx.wait();

console.log("Granting OPERATOR_ROLE...");
const grantRoleTx = await membershipLock.grantRole(operatorRole, targetUser);
await grantRoleTx.wait();

//授予会员30天
const duration = 30 * 24 * 60 * 60;
console.log("Granting membership...");
const grantMembershipTx = await membershipLock.grantMembership(targetUser, duration);
await grantMembershipTx.wait();

console.log("Setting ABAC attributes...");
const setAttributesTx = await membershipLock.setUserAttributes(
    targetUser,
    2,
    30,
    false
);
await setAttributesTx.wait();

const [aclAllowed, rbacAllowed, abacAllowed] =
    await membershipLock.getAccessDecision(targetUser);

function formatAccess(value: boolean) {
    return value ? "Allowed" : "Denied";
}

console.log("");
console.log("Setup completed");
console.log("Network:", networkName);
console.log("ChainId:", chainId);
console.log("Contract:", membershipLockAddress);
console.log("Target user:", targetUser);
console.log("ACL Access:", formatAccess(aclAllowed));
console.log("RBAC Access:", formatAccess(rbacAllowed));
console.log("ABAC Access:", formatAccess(abacAllowed));