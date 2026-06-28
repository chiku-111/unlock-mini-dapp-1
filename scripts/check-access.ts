import { network } from "hardhat";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const networkName = process.env.DEPLOY_NETWORK ?? "localhost";

const { ethers } = await network.create(networkName);

const providerNetwork = await ethers.provider.getNetwork();
const chainId = Number(providerNetwork.chainId);

//读取deployment JSON
const deploymentPath = join(
    "frontend",
    "src",
    "deployments",
    `${chainId}.json`
);

const deployment = JSON.parse(readFileSync(deploymentPath, "utf8")) as {
    chainId: number;
    network: string;
    membershipLock: string;
    deployedAt: string;
};

//SON 文件里的地址
const membershipLockAddress = deployment.membershipLock;

//读取目标用户地址
const targetUser = process.env.TARGET_USER;

if (targetUser === undefined) {
    throw new Error("Missing TARGET_USER environment variable");
}

//getContractAt: 根据合约名字和合约地址, 连接一个已经部署好的合约
const membershipLock = await ethers.getContractAt(
    "MembershipLock",
    membershipLockAddress
);

const aclAllowed = await membershipLock.canAccessByACL(targetUser);
const rbacAllowed = await membershipLock.canAccessByRBAC(targetUser);
const abacAllowed = await membershipLock.canAccessByABAC(targetUser);

const [combinedAclAllowed, combinedRbacAllowed, combinedAbacAllowed] =
    await membershipLock.getAccessDecision(targetUser);

//解释 ABAC 的第一个条件: 会员是否有效
const hasValidMembership = await membershipLock.hasValidMembership(targetUser);

//读取ABAC用户属性
const attributes = await membershipLock.userAttributes(targetUser);

//读取RBAC, 检查目标用户是否拥有 OPERATOR_ROLE
const operatorRole = await membershipLock.OPERATOR_ROLE();
const hasOperatorRole = await membershipLock.hasRole(operatorRole, targetUser);

function formatAccess(value: boolean) {
    return value ? "Allowed" : "Denied";
}

console.log("Network:", networkName);
console.log("ChainId:", chainId);
console.log("Contract:", membershipLockAddress);
console.log("Target user:", targetUser);

console.log("");
console.log("Single checks:");
console.log("ACL Access:", formatAccess(aclAllowed));
console.log("RBAC Access:", formatAccess(rbacAllowed));
console.log("ABAC Access:", formatAccess(abacAllowed));

//getAccessDecision 返回的整合结果是什么
console.log("");
console.log("Combined check:");
console.log("ACL Access:", formatAccess(combinedAclAllowed));
console.log("RBAC Access:", formatAccess(combinedRbacAllowed));
console.log("ABAC Access:", formatAccess(combinedAbacAllowed));

console.log("");
console.log("Details:");
console.log("Valid membership:", hasValidMembership);
console.log("Has OPERATOR_ROLE:", hasOperatorRole);
console.log("KYC level:", attributes.kycLevel);
console.log("Risk score:", attributes.riskScore);
console.log("Banned:", attributes.banned);