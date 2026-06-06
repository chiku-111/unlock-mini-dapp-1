# Unlock Mini DApp

Unlock Mini DApp 是一个基于 Solidity、Hardhat、React、Vite 和 viem 的会员制 DApp。

用户可以支付 `0.01 ETH` 购买 30 天会员；管理员可以手动授权会员，并提现合约中的 ETH。项目支持本地 Hardhat 网络和 Sepolia 测试网。

## 功能

```txt
连接 MetaMask
根据 chainId 自动选择合约地址
读取会员价格
读取会员状态和到期时间
购买 / 续费会员
读取 owner
判断当前钱包是否 owner
读取合约余额
owner 提现
监听账号切换 accountsChanged
监听网络切换 chainChanged
Sepolia 交易 hash 跳转 Etherscan
```

## 技术栈

```txt
Solidity 0.8.28
Hardhat 3
ethers v6
React
Vite
TypeScript
viem
MetaMask
Sepolia
```

## 项目结构

```txt
contracts/MembershipLock.sol              主合约
test/MembershipLock.ts                    合约测试
scripts/deploy-membership-lock.ts         部署脚本
scripts/check-sepolia.ts                  Sepolia 检查脚本
frontend/src/App.tsx                      前端主页面
frontend/src/abi/MembershipLockAbi.ts     前端 ABI
frontend/src/deployments/                 多网络合约地址
```

`Counter.sol`、`Counter.t.sol`、`MiniMembership.sol` 等学习/模板文件已保留在 `docs/learning/` 中，它们不是当前主线合约。

## 合约功能

主合约：`contracts/MembershipLock.sol`

```txt
owner
price = 0.01 ether
membershipExpiresAt(address)
grantMembership(address user, uint256 duration)
purchaseMembership()
hasValidMembership(address user)
withdraw(address payable recipient)
```

核心规则：

```txt
用户支付 0.01 ETH 购买 30 天会员
有效会员续费会从原到期时间继续累加
owner 可以手动授权会员
owner 可以提现合约余额
grantMembership 会检查零地址和 0 秒时长
withdraw 会检查零地址和合约余额
```

## 支持网络

```txt
31337      Hardhat localhost
11155111   Sepolia
```

Sepolia 合约地址：

```txt
0xE55b07A3D404509b7DEa9FC195E40f4F2FeAB370
```

部署信息位于：

```txt
frontend/src/deployments/31337.json
frontend/src/deployments/11155111.json
frontend/src/deployments/index.ts
```

前端会根据 MetaMask 当前 `chainId` 自动选择对应的合约地址。

## 本地运行

安装依赖：

```powershell
npm install
cd frontend
npm install
```

启动本地 Hardhat 节点：

```powershell
npx.cmd hardhat node
```

部署本地合约：

```powershell
$env:DEPLOY_NETWORK="localhost"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

启动前端：

```powershell
cd frontend
npm.cmd run dev
```

打开：

```txt
http://localhost:5173
```

## Sepolia 部署

使用 Hardhat Keystore 保存 Sepolia 配置：

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

前端读取 Sepolia 需要在 `frontend/.env.local` 中配置：

```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

注意：不要把私钥写入前端 `.env.local`。

## 测试

合约测试：

```powershell
npm.cmd test
```

前端构建：

```powershell
cd frontend
npm.cmd run build
```

## 使用方式

```txt
1. 连接 MetaMask
2. 切换到 Hardhat 或 Sepolia
3. 查看会员价格、状态和到期时间
4. 点击 Purchase Membership 购买 / 续费会员
5. owner 可以点击 Withdraw 提现合约余额
6. Sepolia 交易可通过 Etherscan 链接查看
```

## 当前状态

```txt
合约主线完成
合约测试完成
前端购买会员完成
owner 后台提现完成
本地 Hardhat 支持完成
Sepolia 部署完成
多网络 deployment 支持完成
Etherscan 交易链接完成
README 中文说明已整理
```

## 安全提醒

```txt
不要提交私钥
不要提交助记词
不要把 SEPOLIA_PRIVATE_KEY 写进前端
不要提交 .env 或 .env.local
```
