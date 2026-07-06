# Unlock Mini DApp

[English README](./README.md)

Unlock Mini DApp 是一个基于 Solidity、Hardhat、React、Vite、TypeScript、viem 和 MetaMask 的会员与访问控制演示 DApp。

项目最初是一个简单的会员购买 DApp，现在已经扩展成展示三种访问控制模型的 DApp：

```txt
ACL   Access Control List，白名单访问控制
RBAC  Role-Based Access Control，角色访问控制
ABAC  Attribute-Based Access Control，属性访问控制
```

用户可以支付 `0.01 ETH` 购买 30 天会员。合约 owner 也可以在前端 owner 管理区里，为目标用户授权会员、白名单、角色和属性。

## 功能

```txt
连接 MetaMask
根据 chainId 自动选择合约地址
读取会员价格
读取会员状态和过期时间
购买 / 续费会员
owner 手动授权会员
owner 提现合约 ETH
ACL 白名单管理
RBAC OPERATOR_ROLE 授权 / 撤销
ABAC 用户属性管理
当前钱包访问结果展示
目标用户访问结果展示
Sepolia 交易 hash 跳转 Etherscan
```

## 访问控制模型

### ACL

ACL 使用直接白名单：

```txt
aclAllowlist[user] == true
```

相关函数：

```txt
addToAcl(address user)
removeFromAcl(address user)
canAccessByACL(address user)
```

### RBAC

RBAC 使用角色。本项目定义了：

```txt
OPERATOR_ROLE = keccak256("OPERATOR_ROLE")
```

相关函数：

```txt
grantRole(bytes32 role, address user)
revokeRole(bytes32 role, address user)
hasRole(bytes32 role, address user)
canAccessByRBAC(address user)
```

### ABAC

ABAC 使用用户属性和会员状态共同判断。

当前 ABAC 规则是：

```txt
hasValidMembership(user)
&& userAttributes[user].kycLevel >= 2
&& userAttributes[user].riskScore <= 50
&& userAttributes[user].banned == false
```

也就是：

```txt
用户有有效会员
KYC level 大于等于 2
risk score 小于等于 50
banned 等于 false
```

相关函数：

```txt
setUserAttributes(address user, uint8 kycLevel, uint8 riskScore, bool banned)
```

## 当前钱包和目标用户的区别

前端会展示两组访问结果。

当前钱包：

```txt
ACL Access
RBAC Access
ABAC Access
```

目标用户：

```txt
Target ACL Access
Target RBAC Access
Target ABAC Access
```

`walletAddress` 是当前连接的钱包地址，也就是负责签名、发交易、支付 gas 的操作者。

`targetAddress` 是 owner 管理区输入的目标用户地址，也就是被授权或被撤销权限的用户。

在 ACL/RBAC/ABAC 授权演示中，主要观察的是 `Target ... Access` 这一组结果。

## 合约

主合约：

```txt
contracts/MembershipLock.sol
```

主要函数和公开状态：

```txt
owner()
price()
membershipExpiresAt(address)
purchaseMembership()
grantMembership(address user, uint256 duration)
hasValidMembership(address user)
aclAllowlist(address)
addToAcl(address user)
removeFromAcl(address user)
canAccessByACL(address user)
OPERATOR_ROLE()
grantRole(bytes32 role, address user)
revokeRole(bytes32 role, address user)
hasRole(bytes32 role, address user)
canAccessByRBAC(address user)
userAttributes(address)
setUserAttributes(address user, uint8 kycLevel, uint8 riskScore, bool banned)
canAccessByABAC(address user)
getAccessDecision(address user)
withdraw(address payable recipient)
```

## 前端 owner 管理区

owner 管理区支持：

```txt
targetAddress 输入
Target ACL/RBAC/ABAC Access 显示
Add to ACL
Remove from ACL
Grant OPERATOR_ROLE
Revoke OPERATOR_ROLE
Grant Membership
Set ABAC
Refresh Target Access
```

推荐 ABAC 演示参数：

```txt
KYC level = 2
Risk score = 30
Banned 不勾选
```

## 项目结构

```txt
contracts/MembershipLock.sol              主合约
test/MembershipLock.ts                    合约测试
scripts/deploy-membership-lock.ts         部署脚本
scripts/check-sepolia.ts                  Sepolia 检查脚本
frontend/src/App.tsx                      前端主页面
frontend/src/App.css                      前端页面样式
frontend/src/abi/MembershipLockAbi.ts     前端 ABI
frontend/src/deployments/                 多网络合约地址
```

`docs/learning/` 下保留的是学习和模板文件，不属于当前主线合约流程。

## 支持网络

```txt
31337      Hardhat localhost
11155111   Sepolia
```

当前 Sepolia 合约地址：

```txt
0x1e65386ec16F2Af829497a45E72F6a4136c673D6
```

部署信息位于：

```txt
frontend/src/deployments/31337.json
frontend/src/deployments/11155111.json
frontend/src/deployments/index.ts
```

## 本地运行

安装依赖：

```powershell
npm install
cd frontend
npm install
```

启动本地区块链：

```powershell
cd D:\unlock-mini-dapp
npx.cmd hardhat node
```

部署本地合约：

```powershell
cd D:\unlock-mini-dapp
$env:DEPLOY_NETWORK="localhost"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

启动前端：

```powershell
cd D:\unlock-mini-dapp\frontend
npm.cmd run dev
```

浏览器打开：

```txt
http://localhost:5173
```

## 本地演示流程

MetaMask 设置：

```txt
网络：Localhost 31337
owner 钱包：Hardhat Account #0
targetAddress：Hardhat Account #1
```

操作顺序：

```txt
1. owner 钱包连接页面
2. Target address 填普通用户地址
3. Refresh Target Access
4. Add to ACL
5. Grant OPERATOR_ROLE
6. Grant Membership
7. Set ABAC，KYC level = 2，Risk score = 30，Banned 不勾选
8. Refresh Target Access
9. 确认 Target ACL/RBAC/ABAC Access 都显示 Allowed
```

预期结果：

```txt
Target ACL Access: Allowed
Target RBAC Access: Allowed
Target ABAC Access: Allowed
```

## Sepolia 部署

当前最新 Sepolia 部署信息：

```txt
Network: sepolia
ChainId: 11155111
MembershipLock: 0x1e65386ec16F2Af829497a45E72F6a4136c673D6
```

可以使用 PowerShell 临时环境变量提供 Sepolia 配置：

```powershell
$env:SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
$env:SEPOLIA_PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY"
$env:DEPLOY_NETWORK="sepolia"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

也可以使用 Hardhat Keystore 保存 Sepolia 配置：

```powershell
npx.cmd hardhat keystore set SEPOLIA_RPC_URL
npx.cmd hardhat keystore set SEPOLIA_PRIVATE_KEY
```

检查 Sepolia 连接：

```powershell
npx.cmd hardhat run scripts/check-sepolia.ts
```

部署到 Sepolia：

```powershell
$env:DEPLOY_NETWORK="sepolia"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

部署完成后，确认这个文件已经写入新的 Sepolia 合约地址：

```txt
frontend/src/deployments/11155111.json
```

前端读取 Sepolia 链上数据时，需要在 `frontend/.env.local` 中配置：

```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

不要把私钥写入前端环境文件。

## Sepolia 前端演示流程

MetaMask 设置：

```txt
网络：Sepolia
owner 钱包：部署 Sepolia 合约的钱包
targetAddress：另一个 MetaMask 账户地址，用作目标用户
```

操作顺序：

```txt
1. 启动前端并连接 owner 钱包
2. 输入 targetAddress
3. 点击 Refresh Target Access
4. 点击 Add to ACL，并在 MetaMask 确认交易
5. 点击 Grant OPERATOR_ROLE，并在 MetaMask 确认交易
6. 点击 Grant Membership，并在 MetaMask 确认交易
7. 设置 ABAC：KYC level = 2，Risk score = 30，Banned 不勾选
8. 点击 Set ABAC，并在 MetaMask 确认交易
9. 再点击 Refresh Target Access
10. 确认 Target ACL/RBAC/ABAC Access 都显示 Allowed
```

## 构建和测试

合约测试：

```powershell
npm.cmd test
```

前端构建：

```powershell
cd frontend
npm.cmd run build
```

最近一次已知本地测试结果：

```txt
npx.cmd hardhat test
53 passing
```

## 安全提醒

```txt
不要提交私钥
不要提交助记词
不要把 SEPOLIA_PRIVATE_KEY 写进前端
不要提交 .env 或 .env.local
```
