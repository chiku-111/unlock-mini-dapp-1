# Unlock Mini DApp 

[中文说明](./README_zh.md)

Unlock Mini DApp is a membership-based DApp built with Solidity, Hardhat, React, Vite, and viem.

Users can pay `0.01 ETH` to purchase a 30-day membership. The owner can manually grant memberships and withdraw ETH from the contract. The project supports both the local Hardhat network and the Sepolia testnet.

## Features

```txt
Connect MetaMask
Automatically select the contract address by chainId
Read membership price
Read membership status and expiration time
Purchase / renew membership
Read owner
Check whether the current wallet is owner
Read contract balance
Owner withdrawal
Listen to accountsChanged
Listen to chainChanged
Link Sepolia transaction hashes to Etherscan
```

## Tech Stack

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

Learning/template files such as `Counter.sol`, `Counter.t.sol`, and `MiniMembership.sol` are kept under `docs/learning/`. They are not part of the current main contract flow.

## Contract Features

Main contract: `contracts/MembershipLock.sol`

```txt
owner
price = 0.01 ether
membershipExpiresAt(address)
grantMembership(address user, uint256 duration)
purchaseMembership()
hasValidMembership(address user)
withdraw(address payable recipient)
```

Core rules:

```txt
Users pay 0.01 ETH to purchase a 30-day membership
Active membership renewals continue from the current expiration time
owner can manually grant memberships
owner can withdraw the contract balance
grantMembership checks zero address and zero duration
withdraw checks zero address and contract balance
```

## Supported Networks

```txt
31337      Hardhat localhost
11155111   Sepolia
```

Sepolia contract address:

```txt
0xE55b07A3D404509b7DEa9FC195E40f4F2FeAB370
```

Deployment information is stored in:

```txt
frontend/src/deployments/31337.json
frontend/src/deployments/11155111.json
frontend/src/deployments/index.ts
```

The frontend automatically selects the corresponding contract address based on the current MetaMask `chainId`.

## Local Development

Install dependencies:

```powershell
npm install
cd frontend
npm install
```

Start the local Hardhat node:

```powershell
npx.cmd hardhat node
```

Deploy the local contract:

```powershell
$env:DEPLOY_NETWORK="localhost"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

Start the frontend:

```powershell
cd frontend
npm.cmd run dev
```

Open:

```txt
http://localhost:5173
```

## Sepolia Deployment

Use Hardhat Keystore to store the Sepolia configuration:

```powershell
npx.cmd hardhat keystore set SEPOLIA_RPC_URL
npx.cmd hardhat keystore set SEPOLIA_PRIVATE_KEY
```

Check the Sepolia connection:

```powershell
npx.cmd hardhat run scripts/check-sepolia.ts
```

Deploy to Sepolia:

```powershell
$env:DEPLOY_NETWORK="sepolia"
npx.cmd hardhat run scripts/deploy-membership-lock.ts
```

To let the frontend read from Sepolia, configure `frontend/.env.local`:

```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

Do not put private keys in the frontend `.env.local` file.

## Tests

Contract tests:

```powershell
npm.cmd test
```

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

## Usage

```txt
1. Connect MetaMask
2. Switch to Hardhat or Sepolia
3. View membership price, status, and expiration time
4. Click Purchase Membership to purchase / renew membership
5. owner can click Withdraw to withdraw the contract balance
6. Sepolia transactions can be viewed through Etherscan links
```

## Current Status

```txt
Main contract flow completed
Contract tests completed
Frontend membership purchase completed
Owner withdrawal panel completed
Local Hardhat support completed
Sepolia deployment completed
Multi-network deployment support completed
Etherscan transaction links completed
Chinese README documentation organized
```

## Security Notes

```txt
Do not commit private keys
Do not commit seed phrases
Do not put SEPOLIA_PRIVATE_KEY in the frontend
Do not commit .env or .env.local
```

