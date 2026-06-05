# Unlock Mini DApp 中文说明

Unlock Mini DApp 是一个基于 Solidity、Hardhat、React、Vite 和 viem 的会员制 DApp 学习项目。

项目目标是实现一个简单但完整的链上会员系统：用户支付固定价格购买 30 天会员，会员有效期记录在智能合约中；管理员可以手动授权会员，也可以把合约中的 ETH 提现。

当前项目已经支持：

```txt
本地 Hardhat 网络：chainId 31337
Sepolia 测试网：chainId 11155111
MetaMask 钱包连接
根据 chainId 自动选择合约地址
读取会员价格、管理员地址、合约余额、会员状态、会员到期时间
用户购买 / 续费会员
管理员提现
账号切换和网络切换监听
```

## 1. 技术栈

```txt
Solidity 0.8.28
Hardhat 3
ethers v6
Hardhat Keystore
TypeScript
React
Vite
viem
MetaMask
Sepolia 测试网
```

## 2. 项目结构

```txt
contracts/
  MembershipLock.sol          主合约
  Counter.sol                 Hardhat 模板练习文件，非主线
  Counter.t.sol               Hardhat / Foundry 风格模板练习文件，非主线
  MiniMembership.sol          早期练习合约，非主线

test/
  MembershipLock.ts           主合约测试

scripts/
  deploy-membership-lock.ts   部署 MembershipLock，并写入 deployments JSON
  check-sepolia.ts            检查 Sepolia RPC、部署钱包和余额

frontend/
  src/App.tsx                 前端主页面
  src/abi/MembershipLockAbi.ts
  src/deployments/31337.json
  src/deployments/11155111.json
  src/deployments/index.ts
```

当前主线合约是：

```txt
contracts/MembershipLock.sol
```

`Counter.sol`、`Counter.t.sol`、`MiniMembership.sol` 目前不是主线功能，只是学习和模板残留文件。后续可以删除，或者保留并在文档中说明用途。

## 3. 合约功能

主合约：

```txt
contracts/MembershipLock.sol
```

合约当前包含：

```txt
owner
price
membershipExpiresAt(address)
grantMembership(address user, uint256 duration)
purchaseMembership()
hasValidMembership(address user)
withdraw(address payable recipient)
```

### owner

`owner` 是管理员地址。合约部署时，部署合约的钱包会成为 `owner`。

管理员可以：

```txt
手动授权会员
提现合约中的 ETH
```

### price

`price` 是会员价格，当前固定为：

```txt
0.01 ETH
```

用户购买会员时，必须刚好支付 `0.01 ETH`。

### membershipExpiresAt

`membershipExpiresAt(address)` 用来记录某个用户的会员到期时间。

它保存的是 Unix 时间戳，也就是从 1970-01-01 到某个时间点经过的秒数。前端会把这个时间戳转换成人能看懂的日期。

### grantMembership

`grantMembership(address user, uint256 duration)` 是管理员手动授权会员的函数。

当前规则：

```txt
只有 owner 可以调用
user 不能是零地址
duration 必须大于 0
授权后会设置会员到期时间
授权成功后会触发 MembershipGranted 事件
```

### purchaseMembership

`purchaseMembership()` 是用户购买或续费会员的函数。

当前规则：

```txt
必须支付刚好 0.01 ETH
每次购买增加 30 天会员时间
如果会员已经过期，从当前时间开始加 30 天
如果会员仍然有效，从原到期时间继续加 30 天
购买成功后会触发 MembershipPurchased 事件
```

这意味着有效会员再次购买时，不会浪费原来剩余的会员时间。

### hasValidMembership

`hasValidMembership(address user)` 用来判断用户当前是否有有效会员。

判断逻辑：

```txt
membershipExpiresAt[user] > block.timestamp
```

如果到期时间大于当前区块时间，说明会员还有效。

### withdraw

`withdraw(address payable recipient)` 是管理员提现函数。

当前规则：

```txt
只有 owner 可以调用
recipient 不能是零地址
合约余额必须大于 0
提现成功后会触发 Withdrawn 事件
```

## 4. 合约事件

当前合约包含三个事件：

```txt
MembershipPurchased(address indexed user, uint256 amount, uint256 expiresAt)
MembershipGranted(address indexed user, uint256 duration, uint256 expiresAt)
Withdrawn(address indexed recipient, uint256 amount)
```

这些事件用于记录：

```txt
谁购买了会员
支付了多少钱
会员到期时间是多少
谁被管理员授权
管理员把 ETH 提现到哪个地址
```

## 5. 前端功能

前端主文件：

```txt
frontend/src/App.tsx
```

当前前端已经实现：

```txt
连接 MetaMask
保存当前钱包地址
读取 MetaMask 当前 chainId
根据 chainId 自动选择部署文件
根据网络创建 publicClient
读取合约地址
读取 owner
判断当前钱包是否 owner
读取合约余额
读取会员价格
读取会员状态
读取会员到期时间
购买 / 续费会员
管理员提现
显示 purchase status
显示 withdraw status
显示交易 hash
监听 accountsChanged
监听 chainChanged
```

当前支持的网络：

```txt
31337     本地 Hardhat
11155111  Sepolia 测试网
```

如果用户切换到其他网络，前端会把它当成 unsupported network。

## 6. deployments 地址管理

前端不再只依赖一个写死的合约地址，而是通过 `chainId` 选择部署信息。

部署文件位置：

```txt
frontend/src/deployments/31337.json
frontend/src/deployments/11155111.json
frontend/src/deployments/index.ts
```

当前 Sepolia 合约地址：

```txt
0xE55b07A3D404509b7DEa9FC195E40f4F2FeAB370
```

部署文件示例：

```json
{
  "chainId": 11155111,
  "network": "sepolia",
  "membershipLock": "0xE55b07A3D404509b7DEa9FC195E40f4F2FeAB370",
  "deployedAt": "2026-06-04T13:12:37.543Z"
}
```

`frontend/src/deployments/index.ts` 会把这些 JSON 文件集中管理。

前端逻辑可以理解成：

```txt
MetaMask 当前 chainId 是 31337
  -> 使用 31337.json 里的 MembershipLock 地址

MetaMask 当前 chainId 是 11155111
  -> 使用 11155111.json 里的 MembershipLock 地址

MetaMask 当前 chainId 是其他值
  -> 显示 unsupported network
```

## 7. 本地运行

### 7.1 安装依赖

如果还没有安装根目录依赖：

```powershell
npm install
```

如果还没有安装前端依赖：

```powershell
cd frontend
npm install
```

### 7.2 启动本地 Hardhat 节点

在项目根目录打开一个终端：

```powershell
npx.cmd hardhat node
```

保持这个终端不要关闭。

### 7.3 部署本地合约

再打开一个新的终端，进入项目根目录：

```powershell
$env:DEPLOY_NETWORK="localhost"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

部署完成后，脚本会写入：

```txt
frontend/src/deployments/31337.json
```

### 7.4 启动前端

进入前端目录：

```powershell
cd frontend
npm.cmd run dev
```

打开浏览器访问 Vite 给出的地址，通常是：

```txt
http://localhost:5173
```

## 8. Sepolia 配置

Sepolia 是以太坊测试网，用于在真实网络环境中测试 DApp。Sepolia ETH 是测试币，没有真实价值，但可以支付测试网 gas。

### 8.1 准备测试钱包

建议使用单独的钱包作为测试部署钱包，不要使用主钱包。

### 8.2 准备 Sepolia RPC URL

可以使用 Alchemy、Infura 等服务创建 Sepolia RPC URL。RPC URL 的作用是让 Hardhat 或前端知道应该连接哪一个 Sepolia 节点。

### 8.3 使用 Hardhat Keystore 保存部署密钥

不要把私钥写进代码。不要把私钥写进 `.env` 后提交到 GitHub。

当前项目使用 Hardhat Keystore 管理：

```txt
SEPOLIA_RPC_URL
SEPOLIA_PRIVATE_KEY
```

设置命令：

```powershell
npx.cmd hardhat keystore set SEPOLIA_RPC_URL
npx.cmd hardhat keystore set SEPOLIA_PRIVATE_KEY
```

检查 keystore 中有哪些变量：

```powershell
npx.cmd hardhat keystore list
```

注意：不要在公开场景展示私钥内容。

### 8.4 检查 Sepolia 连接

运行：

```powershell
npx.cmd hardhat run scripts/check-sepolia.ts
```

这个脚本会检查：

```txt
Hardhat 是否能连接 Sepolia
当前使用的钱包地址
当前钱包 SepoliaETH 余额
当前网络 chainId
```

### 8.5 部署到 Sepolia

运行：

```powershell
$env:DEPLOY_NETWORK="sepolia"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

部署成功后，脚本会写入：

```txt
frontend/src/deployments/11155111.json
```

## 9. 前端 Sepolia RPC

前端读取 Sepolia 链上数据时，也需要一个浏览器可访问的 Sepolia RPC。

在前端目录创建：

```txt
frontend/.env.local
```

写入：

```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

注意：

```txt
这里不要写私钥
这里不要写 SEPOLIA_PRIVATE_KEY
VITE_ 开头的变量会被前端浏览器使用
.env.local 不要提交到 GitHub
```

`.gitignore` 和 `frontend/.gitignore` 已经会忽略本地环境文件。

## 10. 测试命令

运行合约测试：

```powershell
npm.cmd test
```

或者：

```powershell
npx.cmd hardhat test
```

运行前端构建：

```powershell
cd frontend
npm.cmd run build
```

当前已知测试覆盖包括：

```txt
owner 初始化
默认非会员
owner 授权
授权后有效
授权过期
非 owner 不能授权
不能授权零地址
不能授权 0 秒时长
无付款 / 少付 / 多付购买失败
正确付款购买成功
购买后合约收到 ETH
购买会员 30 天后过期
有效会员续费会从原到期时间继续累加
owner 提现
非 owner 不能提现
不能提现到零地址
余额为 0 不能提现
购买 / 授权 / 提现事件
```

## 11. 使用流程

### 11.1 连接钱包

打开前端页面后，点击：

```txt
Connect Wallet
```

MetaMask 会请求连接钱包。

连接成功后，页面会显示：

```txt
Wallet
Network chainId
Contract address
Contract owner
Current wallet is owner
Contract balance
Current status
Membership price
Membership expires at
```

### 11.2 购买会员

点击：

```txt
Purchase Membership
```

MetaMask 会弹出交易确认。确认后，前端会等待交易上链。

交易确认后，页面会刷新：

```txt
会员状态
会员到期时间
合约余额
```

### 11.3 管理员提现

如果当前钱包是 `owner`，页面会显示提现按钮：

```txt
Withdraw
```

点击后，MetaMask 会弹出交易确认。提现成功后，合约余额会刷新。

## 12. 当前已验证状态

当前项目已完成：

```txt
本地 Hardhat 合约测试通过
前端构建通过
Sepolia 合约部署成功
Sepolia 前端读取 owner / price / balance / membership 成功
Sepolia 购买会员流程已测试
```

当前 Sepolia 合约：

```txt
0xE55b07A3D404509b7DEa9FC195E40f4F2FeAB370
```

## 13. 当前还没有完成的内容

以下内容还可以继续完善：

```txt
Sepolia Etherscan 交易链接
更清晰的错误提示
更正式的 UI 分区
移除或整理 Counter / MiniMembership 练习文件
解决前端中的 @ts-ignore 类型问题
自动生成 ABI，避免手写 ABI 和合约不同步
让 owner 可以修改会员价格
README 截图和演示流程
```

### Etherscan 链接说明

当前前端可以保存并显示交易 hash，但还没有完整实现 Sepolia Etherscan 跳转链接。

后续可以实现：

```txt
如果 chainId === 11155111
  显示 https://sepolia.etherscan.io/tx/{hash}

如果 chainId === 31337
  只显示本地交易 hash
```

## 14. 安全提醒

```txt
不要提交私钥
不要提交真实钱包助记词
不要把 SEPOLIA_PRIVATE_KEY 写进前端代码
不要把私钥写进 README
不要在截图里暴露私钥
不要用主钱包做学习部署
```

SepoliaETH 是测试币，没有真实价值。

但私钥仍然需要保护，因为它代表这个测试钱包的控制权。

## 15. 项目完成度

当前项目已经从本地 MVP 进展为支持 Sepolia 的多网络会员 DApp。

以学习项目和会议展示标准看，当前已经具备：

```txt
完整合约主线
完整合约测试主线
前端读写合约
owner 管理功能
本地 + Sepolia 多网络支持
部署脚本自动写入 deployment
基础 README 说明
```

后续重点是展示质量和工程细节：

```txt
Etherscan 链接
UI 整理
错误提示细化
文件结构清理
ABI 自动化
```

完成这些后，项目会更接近一个完整可展示的 DApp。
