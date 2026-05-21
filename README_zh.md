# Unlock Mini DApp

 mini membership gating DApp。

当前项目实现了一个本地 Hardhat 链上的会员访问控制闭环：

```txt
连接钱包 -> 读取会员状态 -> 购买会员 -> 写入到期时间 -> 页面显示 unlocked
```

## 当前状态

已验证：

```txt
npx hardhat test
27 passing

cd frontend
npm run build
passed
```

## 技术栈

```txt
Solidity 0.8.28
Hardhat 3
Ethers v6
React
Vite
TypeScript
viem
MetaMask
```

## 已实现功能

### 合约

主合约：

```txt
contracts/MembershipLock.sol
```

已实现：

```txt
owner 管理员
price = 0.01 ether
membershipExpiresAt(address) 会员到期时间
grantMembership(address user, uint256 duration)
purchaseMembership() payable
hasValidMembership(address user)
withdraw(address payable recipient)
MembershipPurchased 事件
MembershipGranted 事件
Withdrawn 事件
```

### 测试

主测试：

```txt
test/MembershipLock.ts
```

已覆盖：

```txt
owner 初始化
默认非会员
owner 授权会员
授权后有效
授权过期后失效
非 owner 不能授权
无付款 / 少付 / 多付购买失败
正确付款购买成功
购买后合约收到 ETH
购买会员 30 天后过期
owner 提现
非 owner 不能提现
不能提现到零地址
余额为 0 不能提现
购买 / 授权 / 提现事件
```

### 前端

主文件：

```txt
frontend/src/App.tsx
```

已实现：

```txt
连接 MetaMask
显示钱包地址
读取并显示会员价格 price()
检查会员状态 locked / unlocked
读取并显示会员到期时间 membershipExpiresAt(address)
购买会员 purchaseMembership()
购买时发送 0.01 ETH
等待交易确认后刷新状态
基础错误提示
检查按钮 loading / disabled 状态
```

ABI：

```txt
frontend/src/abi/MembershipLockAbi.ts
```

当前包含：

```txt
hasValidMembership
price
purchaseMembership
membershipExpiresAt
```

## 本地运行

### 1. 启动 Hardhat 节点

```powershell
npx.cmd hardhat node
```

### 2. 部署合约

```powershell
npx.cmd hardhat run .\scripts\deploy-membership-lock.ts --network localhost
```

复制输出的合约地址到：

```txt
frontend/src/config.ts
```

### 3. 启动前端

```powershell
cd frontend
npm run dev
```

### 4. MetaMask 配置

```txt
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency: ETH
```

导入 Hardhat node 输出的测试账号私钥。

### 5. 页面操作

```txt
Connect Wallet
Load Price
Check Membership
Purchase Membership
```

购买成功后页面应显示：

```txt
Current status: unlocked
Membership expires at: ...
```

## 常用命令

运行测试：

```powershell
npx.cmd hardhat test
```

前端构建：

```powershell
cd frontend
npm.cmd run build
```