# Unlock Mini DApp

[中文说明](./README_zh.md)

Unlock Mini DApp is a membership and access-control demo built with Solidity, Hardhat, React, Vite, TypeScript, viem, and MetaMask.

The project started as a simple membership purchase DApp and now demonstrates three access-control models:

```txt
ACL   Access Control List
RBAC  Role-Based Access Control
ABAC  Attribute-Based Access Control
```

Users can pay `0.01 ETH` to purchase a 30-day membership. The contract owner can also manage access for a target user from the frontend owner panel.

## Features

```txt
Connect MetaMask
Automatically select contract address by chainId
Read membership price
Read membership status and expiration time
Purchase / renew membership
Owner grants membership manually
Owner withdraws contract ETH
ACL allowlist management
RBAC OPERATOR_ROLE grant / revoke
ABAC user attribute management
Current wallet access result display
Target user access result display
Sepolia Etherscan transaction links
```

## Access Models

### ACL

ACL uses a direct allowlist:

```txt
aclAllowlist[user] == true
```

Owner functions:

```txt
addToAcl(address user)
removeFromAcl(address user)
canAccessByACL(address user)
```

### RBAC

RBAC uses roles. This project defines:

```txt
OPERATOR_ROLE = keccak256("OPERATOR_ROLE")
```

Owner functions:

```txt
grantRole(bytes32 role, address user)
revokeRole(bytes32 role, address user)
hasRole(bytes32 role, address user)
canAccessByRBAC(address user)
```

### ABAC

ABAC uses user attributes plus membership status.

The current ABAC rule is:

```txt
hasValidMembership(user)
&& userAttributes[user].kycLevel >= 2
&& userAttributes[user].riskScore <= 50
&& userAttributes[user].banned == false
```

Owner function:

```txt
setUserAttributes(address user, uint8 kycLevel, uint8 riskScore, bool banned)
```

## Wallet vs Target User

The frontend shows two groups of access results.

Current wallet:

```txt
ACL Access
RBAC Access
ABAC Access
```

Target user:

```txt
Target ACL Access
Target RBAC Access
Target ABAC Access
```

`walletAddress` is the currently connected wallet. It signs transactions and pays gas.

`targetAddress` is the user address entered in the owner management panel. It is the user being granted or revoked access.

For the ACL/RBAC/ABAC owner demo, the main result to watch is the `Target ... Access` group.

## Contract

Main contract:

```txt
contracts/MembershipLock.sol
```

Main functions and public state:

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

## Frontend Owner Panel

The owner management panel supports:

```txt
Target address input
Target ACL/RBAC/ABAC Access display
Add to ACL
Remove from ACL
Grant OPERATOR_ROLE
Revoke OPERATOR_ROLE
Grant Membership
Set ABAC
Refresh Target Access
```

Recommended ABAC demo values:

```txt
KYC level = 2
Risk score = 30
Banned = unchecked
```

## Project Structure

```txt
contracts/MembershipLock.sol              Main contract
test/MembershipLock.ts                    Contract tests
scripts/deploy-membership-lock.ts         Deployment script
scripts/check-sepolia.ts                  Sepolia check script
frontend/src/App.tsx                      Main frontend page
frontend/src/abi/MembershipLockAbi.ts     Frontend ABI
frontend/src/deployments/                 Multi-network contract addresses
```

Learning/template files are kept under `docs/learning/`. They are not part of the current main contract flow.

## Supported Networks

```txt
31337      Hardhat localhost
11155111   Sepolia
```

Current Sepolia contract address:

```txt
0x1e65386ec16F2Af829497a45E72F6a4136c673D6
```

Deployment files:

```txt
frontend/src/deployments/31337.json
frontend/src/deployments/11155111.json
frontend/src/deployments/index.ts
```

## Local Development

Install dependencies:

```powershell
npm install
cd frontend
npm install
```

Start the local Hardhat node:

```powershell
cd D:\unlock-mini-dapp
npx.cmd hardhat node
```

Deploy the local contract:

```powershell
cd D:\unlock-mini-dapp
$env:DEPLOY_NETWORK="localhost"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

Start the frontend:

```powershell
cd D:\unlock-mini-dapp\frontend
npm.cmd run dev
```

Open:

```txt
http://localhost:5173
```

## Local Demo Flow

MetaMask setup:

```txt
Network: Localhost 31337
Owner wallet: Hardhat Account #0
Target address: Hardhat Account #1
```

Demo steps:

```txt
1. Connect the owner wallet
2. Enter the target user address
3. Click Refresh Target Access
4. Click Add to ACL
5. Click Grant OPERATOR_ROLE
6. Click Grant Membership
7. Set ABAC with KYC level 2, risk score 30, banned unchecked
8. Click Refresh Target Access
9. Confirm Target ACL/RBAC/ABAC Access all show Allowed
```

Expected result:

```txt
Target ACL Access: Allowed
Target RBAC Access: Allowed
Target ABAC Access: Allowed
```

## Sepolia Deployment

The latest Sepolia deployment is:

```txt
Network: sepolia
ChainId: 11155111
MembershipLock: 0x1e65386ec16F2Af829497a45E72F6a4136c673D6
```

You can provide Sepolia configuration with temporary PowerShell environment variables:

```powershell
$env:SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
$env:SEPOLIA_PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY"
$env:DEPLOY_NETWORK="sepolia"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

Or use Hardhat Keystore to store Sepolia configuration:

```powershell
npx.cmd hardhat keystore set SEPOLIA_RPC_URL
npx.cmd hardhat keystore set SEPOLIA_PRIVATE_KEY
```

Check Sepolia connection:

```powershell
npx.cmd hardhat run scripts/check-sepolia.ts
```

Deploy to Sepolia:

```powershell
$env:DEPLOY_NETWORK="sepolia"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

After deployment, confirm that `frontend/src/deployments/11155111.json` contains the new Sepolia contract address.

## Sepolia Frontend Demo

MetaMask setup:

```txt
Network: Sepolia
Owner wallet: the wallet that deployed the Sepolia contract
Target address: another MetaMask account used as the target user
```

Demo steps:

```txt
1. Start the frontend and connect the owner wallet
2. Enter the target user address
3. Click Refresh Target Access
4. Click Add to ACL and confirm the transaction
5. Click Grant OPERATOR_ROLE and confirm the transaction
6. Click Grant Membership and confirm the transaction
7. Set ABAC with KYC level 2, risk score 30, banned unchecked
8. Click Set ABAC and confirm the transaction
9. Click Refresh Target Access
10. Confirm Target ACL/RBAC/ABAC Access all show Allowed
```

Configure the frontend Sepolia RPC URL in `frontend/.env.local`:

```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

Do not put private keys in frontend environment files.

## Build and Test

Contract tests:

```powershell
npm.cmd test
```

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

Latest known local result:

```txt
npx.cmd hardhat test
53 passing
```

## Security Notes

```txt
Do not commit private keys
Do not commit seed phrases
Do not put SEPOLIA_PRIVATE_KEY in the frontend
Do not commit .env or .env.local
```
