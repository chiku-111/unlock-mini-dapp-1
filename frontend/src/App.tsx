// useState 用来保存页面状态，例如 locked / unlocked。
import { useState, useEffect , useMemo } from 'react'
import "./App.css";

import { 
  createPublicClient,
  createWalletClient,
  custom,
  http, 
  // parseEther 可以把 ETH 字符串转换成 wei；这里暂时没有使用。
  formatEther,  // 把链上的 wei 转换成人类可读的 ETH 字符串。
  type Address, 
} from 'viem';

import { hardhat, sepolia } from "viem/chains";

// 引入 MembershipLock 合约 ABI。
import { MEMBERSHIP_LOCK_ABI } from "./abi/MembershipLockAbi";

// 根据 chainId 读取对应网络的 deployment。
import { getDeploymentByChainId } from "./deployments";

type AccessState = "locked" | "unlocked";

// owner 专用操作状态。
type OwnerActionStatus =
  | "idle"
  | "waitingWallet"
  | "pending"
  | "confirmed"
  | "failed";

// 购买流程状态：空闲、等待钱包确认、交易待确认、已确认、失败。
type PurchaseStatus = "idle" | "waitingWallet" | "pending" | "confirmed" | "failed";

// 提现流程状态。
type WithdrawStatus = "idle" | "waitingWallet" | "pending" | "confirmed" | "failed";

// EthereumProvider 描述 MetaMask 注入到 window.ethereum 的对象类型。
type EthereumProvider = {
  // eth_requestAccounts 用来请求用户授权当前网站访问钱包账户。
  request: (args: {method: string; params?: unknown[]}) => Promise<unknown>;
  // on 用来监听钱包事件，removeListener 用来取消监听。
  on? : (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeListener? : (eventName: string, handler: (...args: unknown[]) => void) => void;
};



// 扩展全局 Window 类型，因为 window 上可能存在 ethereum。
declare global {
    interface Window {

      // ethereum 是可选属性，因为用户可能没有安装 MetaMask。
    ethereum?: EthereumProvider;
    }
  }

  // publicClient 用来读取链上公开数据，不需要钱包签名。

  /* 旧写法：固定创建本地 publicClient，保留作学习参考。
    chain: hardhat,

      // Hardhat 本地 RPC 地址。
    transport: http("http://127.0.0.1:8545"),
  });*/

 /* 旧写法：固定读取 31337 deployment，保留作学习参考。

  if(currentDeployment === null){
    throw new Error("Missing local deployment for chainId 31337");
  }

  const membershipLockAddress = currentDeployment.membershipLock as Address;*/
  

// 创建页面访问状态，初始值是 locked。
// setAccessState 用来更新 accessState，状态变化后 React 会重新渲染页面。

function App() {
const [accessState, setAccessState] = useState<AccessState>("locked");
const [aclAllowed, setAclAllowed] = useState<boolean | null>(null);
const [rbacAllowed, setRbacAllowed] = useState<boolean | null>(null);
const [abacAllowed, setAbacAllowed] = useState<boolean | null>(null);

const [targetAclAllowed, setTargetAclAllowed] = useState<boolean | null>(null);
const [targetRbacAllowed, setTargetRbacAllowed] = useState<boolean | null>(null);
const [targetAbacAllowed, setTargetAbacAllowed] = useState<boolean | null>(null);
// 保存是否正在读取 targetAddress 的访问结果。
const [isCheckingTargetAccessDecision, setIsCheckingTargetAccessDecision] = useState(false);

// owner 想管理的目标用户地址。
const [targetAddress, setTargetAddress] = useState("");
const [kycLevelInput, setKycLevelInput] = useState("2");
const [riskScoreInput, setRiskScoreInput] = useState("30");
const [bannedInput, setBannedInput] = useState(false);
const [ownerActionStatus, setOwnerActionStatus] =
  useState<OwnerActionStatus>("idle");
const [ownerActionTxHash, setOwnerActionTxHash] = useState<string | null>(null);

// 保存是否正在读取当前钱包的 ACL/RBAC/ABAC 访问结果。
const [isCheckingAccessDecision, setIsCheckingAccessDecision] = useState(false);
// 保存从 price() 读取到的会员价格；空字符串表示尚未加载。
const [membershipPrice, setMembershipPrice] = useState<string>("");
const [walletAddress, setWalletAddress]= useState<Address | null>(null);
// 保存连接钱包时的错误信息；null 表示当前没有错误。
const [walletError, setWalletError]= useState<string | null>(null);
const [membershipError, setMembershipError] = useState<string | null>(null);
// 保存当前是否正在检查会员状态。
const [isCheckMembership, setIsCheckingMembership] = useState(false);
// 保存会员到期时间的显示文本。
const [membershipExpiresAtText, setMembershipExpiresAtText] = useState<string>("");
// 保存链上的原始会员价格，单位是 wei。
const[membershipPriceRaw,  setMembershipPriceRaw] = useState<bigint | null>(null);
// 创建购买流程状态，默认是 idle。
const[purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("idle");
// 保存购买交易 hash；空字符串表示还没有交易。
const[purchaseTxHash, setPurchaseTxHash] = useState<string>("");
// 保存合约 owner 地址。
const [contractOwnerAddress, setContractOwnerAddress] = useState<Address | null>(null);
// 保存合约余额。
const [contractBalance, setContractBalance] = useState<string>("");

const [withdrawStatus, setWithdrawStatus] = useState<WithdrawStatus>("idle");

// 保存提现交易 hash；空字符串表示还没有交易。
const [withdrawTxHash, setWithdrawTxHash] = useState<string>("");

// 当前网络 chainId。
const [currentChainId, setCurrentChainId] = useState<number |null>(null);

// 如果已经知道 chainId，就根据 chainId 查找对应 deployment。
const currentDeployment = currentChainId === null ? null : getDeploymentByChainId(currentChainId);

// 如果找到 deployment，就取出 membershipLock 合约地址。
const membershipLockAddress = currentDeployment === null ? null : (currentDeployment.membershipLock as Address);

// 如果已经知道 chainId，但找不到 deployment，就说明当前网络不支持。
const isUnsupportedNetwork = currentChainId !== null && currentDeployment === null;

// Sepolia Etherscan 基础地址。
const etherscanBaseUrl = currentChainId === 11155111 ? "https://sepolia.etherscan.io" : null;


const currentChain = useMemo(() => {
  if(currentChainId === 31337){
    return hardhat;
  }

  if(currentChainId === 11155111){
    return sepolia;
  }

  return null;

}, [currentChainId]);

// useMemo 用来缓存计算结果；依赖不变时不会重新计算。
const publicClient = useMemo(() => {
  if(currentChain === null){
    return null;
  }

  if(currentChainId === 31337){
    return createPublicClient({
      chain: currentChain,
      transport: http("http://127.0.0.1:8545"),
    });
  }

  // 从 Vite 环境变量中读取 Sepolia RPC URL。
  const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;

  if(sepoliaRpcUrl === undefined) {
    return null;
  }

  return createPublicClient({
    chain: currentChain,
    transport: http(sepoliaRpcUrl),
  });
}, [currentChain, currentChainId]);


// 读取当前 MetaMask 网络 chainId。
async function handleLoadChainId() {
  setWalletError(null);

  if (window.ethereum === undefined) {
    setWalletError("MetaMask is not installed");
    return;
  }

  // MetaMask 返回的 chainId 是十六进制字符串。
  try {
    const chainIdHex = await window.ethereum.request({
      method: "eth_chainId",
    }) as string;

    // 把十六进制 chainId 转换成十进制数字。
    const chainId = Number.parseInt(chainIdHex, 16);

    setCurrentChainId(chainId);

  } catch (error) {
    console.log("Failed to read chainId:", error);

    setWalletError("Failed to read network");

  }
  
}

async function handleConnectWallet(){
  // 每次重新连接钱包前，先清空旧错误。
  setWalletError(null);
  if (window.ethereum === undefined){
    setWalletError("MetaMask is not installed");
    return;
  }

  // 请求用户授权当前网站访问钱包账户。

  try {
    const accounts = await window.ethereum.request({
    method: "eth_requestAccounts"
  }) as string[];

  setWalletAddress(accounts[0]  as Address);

  // 读取当前 MetaMask 网络 chainId。
  await handleLoadChainId();

} catch {
    setWalletError("Failed to connect wallet");
  }
}

// 从链上读取 owner()，并保存到 contractOwnerAddress。
async function handleLoadOwner () {
  setMembershipError(null);

  // 如果没有合约地址或 publicClient，就停止读取。
  if (membershipLockAddress === null || publicClient === null) {
    setMembershipError("Unsupported network");
    return;
  }

  try{
    const client = publicClient as any;

    const owner = (await client.readContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "owner",
    }))as Address;

    // 把刚读到的 owner 地址保存进 React state。
    setContractOwnerAddress(owner);
  }catch(error){
    console.error("Failed to read contract owner:", error);
  }
  
}

// 读取合约余额。
async function handleLoadContractBalance() {
  setMembershipError(null);

if (membershipLockAddress === null || publicClient === null) {
  setMembershipError("Unsupported network");
  return;
}

  try{
    const balance = await publicClient.getBalance({
      address: membershipLockAddress,
    });

    setContractBalance(formatEther(balance));
  }catch(error){
    console.error("Failed to read contract balance:", error);

    setMembershipError("Failed to read contract balance");
  }
}

// 从链上读取 MembershipLock 的会员价格 price，并显示在页面上。
async function handleLoadPrice() {
  setMembershipError(null);

if (membershipLockAddress === null || publicClient === null) {
  setMembershipError("Unsupported network");
  return;
}

  // 尝试读取链上数据；如果失败就进入 catch。
  
  try{
    const client = publicClient as any;
    const price = (await client.readContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "price",
    }))as bigint;

    console.log("Raw price in wei:", price);
    console.log("Formatted price in ETH:", formatEther(price));

    // 把 price 从 wei 转换成 ETH 字符串，并保存到 React state。
    setMembershipPrice(formatEther(price));

    setMembershipPriceRaw(price);

  }catch(error){
    console.error("Failed to read membership price:", error);
    setMembershipError("Failed to read membership price");
  }
  
}

async function handleCheckMembership() {
  setMembershipError(null);

  if(walletAddress === null){
    setAccessState("locked");

    // 如果用户还没连接钱包就检查会员，提示先连接钱包。
    setMembershipError("Please connect wallet first");

    // 立刻结束 handleCheckMembership 函数。
    return;
  }
  
if (membershipLockAddress === null || publicClient === null) {
  setMembershipError("Unsupported network");
  return;
}
    setIsCheckingMembership(true);

    try{
      const client = publicClient as any;

      const isMember = (await client.readContract({
        // address 是合约地址：表示去哪个合约查询。
        address: membershipLockAddress,
        abi: MEMBERSHIP_LOCK_ABI,
        functionName: "hasValidMembership",
        // args 里的 walletAddress 是被查询的用户。
        args: [walletAddress as Address],
      })) as boolean;

      setAccessState(isMember ? "unlocked" : "locked");

      const expiresAt = (await client.readContract({
        address: membershipLockAddress,
        abi: MEMBERSHIP_LOCK_ABI,
        functionName: "membershipExpiresAt",
        args: [walletAddress as Address],
      })) as bigint;

      if(expiresAt === 0n){
        setMembershipExpiresAtText("not set"); // 没有设置会员到期时间。
        
      }else{
        // 把链上的秒级时间戳转换成 JavaScript Date 对象。
        const expiresAtDate = new Date(Number(expiresAt) * 1000);

        // toLocaleString 把 Date 对象转换成本地格式文本。
        setMembershipExpiresAtText(expiresAtDate.toLocaleString());
      }

    }catch {
      setMembershipError("Fail to read Membership from contract");

      setAccessState("locked");
    }finally {
      // 查询结束，关闭 loading 状态。
      setIsCheckingMembership(false);
    }
}

  // 读取当前钱包的 ACL/RBAC/ABAC 访问结果。
  async function handleLoadAccessDecision() {
  setMembershipError(null);

  if (walletAddress === null) {
    setMembershipError("Please connect wallet first");
    setAclAllowed(null);
    setRbacAllowed(null);
    setAbacAllowed(null);
    return;
  }

  if (membershipLockAddress === null || publicClient === null) {
    setMembershipError("Unsupported network");
    setAclAllowed(null);
    setRbacAllowed(null);
    setAbacAllowed(null);
    return;
  }

  setIsCheckingAccessDecision(true);

  try {
    const client = publicClient as any;

    const [aclResult, rbacResult, abacResult] = (await client.readContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "getAccessDecision",
      args: [walletAddress],
    })) as readonly [boolean, boolean, boolean];

    setAclAllowed(aclResult);
    setRbacAllowed(rbacResult);
    setAbacAllowed(abacResult);
  } catch (error) {
    console.error("Failed to read access decision:", error);
    setMembershipError("Failed to read access decision");
    setAclAllowed(null);
    setRbacAllowed(null);
    setAbacAllowed(null);
  } finally {
    setIsCheckingAccessDecision(false);
  }
}

// 读取 targetAddress 的访问结果。
async function handleLoadTargetAccessDecision() {
  setMembershipError(null);

  if (targetAddress.trim() === "") {
    setMembershipError("Please enter target address");
    setTargetAclAllowed(null);
    setTargetRbacAllowed(null);
    setTargetAbacAllowed(null);
    return;
  }

  if (membershipLockAddress === null || publicClient === null) {
    setMembershipError("Unsupported network");
    setTargetAclAllowed(null);
    setTargetRbacAllowed(null);
    setTargetAbacAllowed(null);
    return;
  }

  setIsCheckingTargetAccessDecision(true);

  try {
    const client = publicClient as any;

    const [aclResult, rbacResult, abacResult] = (await client.readContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "getAccessDecision",
      args: [targetAddress.trim() as Address],
    })) as readonly [boolean, boolean, boolean];

    setTargetAclAllowed(aclResult);
    setTargetRbacAllowed(rbacResult);
    setTargetAbacAllowed(abacResult);
  } catch (error) {
    console.error("Failed to read target access decision:", error);
    setMembershipError("Failed to read target access decision");
    setTargetAclAllowed(null);
    setTargetRbacAllowed(null);
    setTargetAbacAllowed(null);
  } finally {
    setIsCheckingTargetAccessDecision(false);
  }
}

// 把 targetAddress 加入 ACL 白名单。
async function handleAddToAcl() {
  setMembershipError(null);
  setOwnerActionTxHash(null);

  if (walletAddress === null) {
    setMembershipError("Please connect wallet first");
    return;
  }

  if (membershipLockAddress === null || publicClient === null || currentChain === null) {
    setMembershipError("Unsupported network");
    return;
  }

  if (!isCurrentWalletOwner) {
    setMembershipError("Only owner can manage access");
    return;
  }

  // trim() 会去掉地址前后的空格。
  if (targetAddress.trim() === "") {
    setMembershipError("Please enter target address");
    return;
  }

  try {
    setOwnerActionStatus("waitingWallet");

    if (window.ethereum === undefined) {
      setMembershipError("MetaMask is not installed");
      return;
    }

    const walletClient = createWalletClient({
      chain: currentChain,
      transport: custom(window.ethereum),
    });

    const hash = await walletClient.writeContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "addToAcl",
      args: [targetAddress.trim() as Address],
      account: walletAddress,
      chain: currentChain,
    });

    setOwnerActionTxHash(hash);
    setOwnerActionStatus("pending");

    await publicClient.waitForTransactionReceipt({ hash });

    setOwnerActionStatus("confirmed");
    await handleLoadAccessDecision();
    await handleLoadTargetAccessDecision();
  } catch (error) {
    console.error("Failed to add to ACL:", error);
    setOwnerActionStatus("failed");
    setMembershipError("Failed to add to ACL");
  }
}

// 把 targetAddress 从 ACL 白名单移除。
async function handleRemoveFromAcl() {
  setMembershipError(null);
  setOwnerActionTxHash(null);

  if (walletAddress === null) {
    setMembershipError("Please connect wallet first");
    return;
  }

  if (membershipLockAddress === null || publicClient === null || currentChain === null) {
    setMembershipError("Unsupported network");
    return;
  }

  if (!isCurrentWalletOwner) {
    setMembershipError("Only owner can manage access");
    return;
  }

  if (targetAddress.trim() === "") {
    setMembershipError("Please enter target address");
    return;
  }

  try {
    setOwnerActionStatus("waitingWallet");

    if (window.ethereum === undefined) {
      setMembershipError("MetaMask is not installed");
      return;
    }

    const walletClient = createWalletClient({
      chain: currentChain,
      transport: custom(window.ethereum),
    });

    const hash = await walletClient.writeContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "removeFromAcl",
      args: [targetAddress.trim() as Address],
      account: walletAddress,
      chain: currentChain,
    });

    setOwnerActionTxHash(hash);
    setOwnerActionStatus("pending");

    await publicClient.waitForTransactionReceipt({ hash });

    setOwnerActionStatus("confirmed");
    await handleLoadAccessDecision();
    await handleLoadTargetAccessDecision();
  } catch (error) {
    console.error("Failed to remove from ACL:", error);
    setOwnerActionStatus("failed");
    setMembershipError("Failed to remove from ACL");
  }
}

async function handleGrantOperatorRole() {
  setMembershipError(null);
  setOwnerActionTxHash(null);

  if (walletAddress === null) {
    setMembershipError("Please connect wallet first");
    return;
  }

  if (membershipLockAddress === null || publicClient === null || currentChain === null) {
    setMembershipError("Unsupported network");
    return;
  }

  if (!isCurrentWalletOwner) {
    setMembershipError("Only owner can manage access");
    return;
  }

  if (targetAddress.trim() === "") {
    setMembershipError("Please enter target address");
    return;
  }

  try {
    setOwnerActionStatus("waitingWallet");

    if (window.ethereum === undefined) {
      setMembershipError("MetaMask is not installed");
      return;
    }

    const client = publicClient as any;

    const operatorRole = (await client.readContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "OPERATOR_ROLE",
      args: [],
    })) as `0x${string}`;

    const walletClient = createWalletClient({
      chain: currentChain,
      transport: custom(window.ethereum),
    });

    const hash = await walletClient.writeContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "grantRole",
      args: [operatorRole, targetAddress.trim() as Address],
      account: walletAddress,
      chain: currentChain,
    });

    setOwnerActionTxHash(hash);
    setOwnerActionStatus("pending");

    await publicClient.waitForTransactionReceipt({ hash });

    setOwnerActionStatus("confirmed");
    await handleLoadAccessDecision();
    await handleLoadTargetAccessDecision();
  } catch (error) {
    console.error("Failed to grant OPERATOR_ROLE:", error);
    setOwnerActionStatus("failed");
    setMembershipError("Failed to grant OPERATOR_ROLE");
  }
}

async function handleRevokeOperatorRole() {
  setMembershipError(null);
  setOwnerActionTxHash(null);

  if (walletAddress === null) {
    setMembershipError("Please connect wallet first");
    return;
  }

  if (membershipLockAddress === null || publicClient === null || currentChain === null) {
    setMembershipError("Unsupported network");
    return;
  }

  if (!isCurrentWalletOwner) {
    setMembershipError("Only owner can manage access");
    return;
  }

  if (targetAddress.trim() === "") {
    setMembershipError("Please enter target address");
    return;
  }

  try {
    setOwnerActionStatus("waitingWallet");

    if (window.ethereum === undefined) {
      setMembershipError("MetaMask is not installed");
      return;
    }

    const client = publicClient as any;

    const operatorRole = (await client.readContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "OPERATOR_ROLE",
      args: [],
    })) as `0x${string}`;

    const walletClient = createWalletClient({
      chain: currentChain,
      transport: custom(window.ethereum),
    });

    const hash = await walletClient.writeContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "revokeRole",
      args: [operatorRole, targetAddress.trim() as Address],
      account: walletAddress,
      chain: currentChain,
    });

    setOwnerActionTxHash(hash);
    setOwnerActionStatus("pending");

    await publicClient.waitForTransactionReceipt({ hash });

    setOwnerActionStatus("confirmed");
    await handleLoadAccessDecision();
    await handleLoadTargetAccessDecision();
  } catch (error) {
    console.error("Failed to revoke OPERATOR_ROLE:", error);
    setOwnerActionStatus("failed");
    setMembershipError("Failed to revoke OPERATOR_ROLE");
  }
}

async function handleGrantMembership() {
  setMembershipError(null);
  setOwnerActionTxHash(null);

  if (walletAddress === null) {
    setMembershipError("Please connect wallet first");
    return;
  }

  if (membershipLockAddress === null || publicClient === null || currentChain === null) {
    setMembershipError("Unsupported network");
    return;
  }

  if (!isCurrentWalletOwner) {
    setMembershipError("Only owner can manage access");
    return;
  }

  if (targetAddress.trim() === "") {
    setMembershipError("Please enter target address");
    return;
  }

  try {
    setOwnerActionStatus("waitingWallet");

    if (window.ethereum === undefined) {
      setMembershipError("MetaMask is not installed");
      return;
    }

    const walletClient = createWalletClient({
      chain: currentChain,
      transport: custom(window.ethereum),
    });

    const duration = 30n * 24n * 60n * 60n;

    const hash = await walletClient.writeContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "grantMembership",
      args: [targetAddress.trim() as Address, duration],
      account: walletAddress,
      chain: currentChain,
    });

    setOwnerActionTxHash(hash);
    setOwnerActionStatus("pending");

    await publicClient.waitForTransactionReceipt({ hash });

    setOwnerActionStatus("confirmed");
    await handleLoadAccessDecision();
    await handleLoadTargetAccessDecision();
    await handleCheckMembership();
  } catch (error) {
    console.error("Failed to grant membership:", error);
    setOwnerActionStatus("failed");
    setMembershipError("Failed to grant membership");
  }
}

async function handleSetAbacAttributes() {
  setMembershipError(null);
  setOwnerActionTxHash(null);

  if (walletAddress === null) {
    setMembershipError("Please connect wallet first");
    return;
  }

  if (membershipLockAddress === null || publicClient === null || currentChain === null) {
    setMembershipError("Unsupported network");
    return;
  }

  if (!isCurrentWalletOwner) {
    setMembershipError("Only owner can manage access");
    return;
  }

  if (targetAddress.trim() === "") {
    setMembershipError("Please enter target address");
    return;
  }

  // 把输入框里的字符串转换成数字。
  const kycLevel = Number(kycLevelInput);
  const riskScore = Number(riskScoreInput);

  if (!Number.isInteger(kycLevel) || kycLevel < 0 || kycLevel > 255) {
    setMembershipError("KYC level must be an integer from 0 to 255");
    return;
  }

  if (!Number.isInteger(riskScore) || riskScore < 0 || riskScore > 100) {
    setMembershipError("Risk score must be an integer from 0 to 100");
    return;
  }

  try {
    setOwnerActionStatus("waitingWallet");

    if (window.ethereum === undefined) {
      setMembershipError("MetaMask is not installed");
      return;
    }

    const walletClient = createWalletClient({
      chain: currentChain,
      transport: custom(window.ethereum),
    });

    const hash = await walletClient.writeContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "setUserAttributes",
      args: [targetAddress.trim() as Address, kycLevel, riskScore, bannedInput],
      account: walletAddress,
      chain: currentChain,
    });

    setOwnerActionTxHash(hash);
    setOwnerActionStatus("pending");

    await publicClient.waitForTransactionReceipt({ hash });

    setOwnerActionStatus("confirmed");
    await handleLoadAccessDecision();
    await handleLoadTargetAccessDecision();
  } catch (error) {
    console.error("Failed to set ABAC attributes:", error);
    setOwnerActionStatus("failed");
    setMembershipError("Failed to set ABAC attributes");
  }
}

    async function handlePurchaseMembership() {
      setMembershipError(null);
      if(window.ethereum === undefined){
        setWalletError("Metamask is not installed");
        return;
      }
      if(walletAddress === null){
        setAccessState("locked");
        setMembershipError("Please connect wallet first");
        return;
      }

      if (membershipLockAddress === null || publicClient === null || currentChain === null) {
        setMembershipError("Unsupported network");
        return;
      }

      if(membershipPriceRaw == null){
        setMembershipError("Please load membership price first");
        return;
      }
      try{
        // 购买流程开始，正在等待用户在 MetaMask 里确认。
        setPurchaseStatus("waitingWallet");
        // 清空上一次购买交易 hash。
        setPurchaseTxHash("");

        // 创建钱包客户端，用来发送写合约交易。
        const walletClient = createWalletClient({
          chain: currentChain,
          transport: custom(window.ethereum),
        });

        // writeContract 会发送一笔写合约交易。
        const hash = await walletClient.writeContract({
          address: membershipLockAddress,
          abi: MEMBERSHIP_LOCK_ABI,
          functionName: "purchaseMembership",
          account: walletAddress,
          chain: currentChain,

          value:membershipPriceRaw,

        });

        setPurchaseTxHash(hash);
        setPurchaseStatus("pending");

        // 等待交易收据，确认交易已经上链。
        await publicClient.waitForTransactionReceipt({hash: hash});

        setPurchaseStatus("confirmed");

        await handleCheckMembership();
      } catch (error) {
        console.error("Failed to purchase membership:", error);
        
        setPurchaseStatus("failed");
        setMembershipError("Failed to purchase membership");
      }
    }


    async function handleWithdraw() {
    setMembershipError(null);

    if (window.ethereum === undefined){
      setWalletError("MetaMask is not installed");
      return;
    }

    if(walletAddress === null){
      setMembershipError("Please connect wallet first");
      return;
    }

    if (membershipLockAddress === null || publicClient === null || currentChain === null) {
      setMembershipError("Unsupported network");
      return;
}

    if(!isCurrentWalletOwner){
      setMembershipError("Only owner can withdraw");
      return;
    }

    try{
      setWithdrawStatus("waitingWallet");
      // 清空上一次提现交易 hash。
      setWithdrawTxHash("");

      const walletClient = createWalletClient({
        chain: currentChain,
        // 使用浏览器钱包 provider 发送交易。
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: membershipLockAddress,
        abi: MEMBERSHIP_LOCK_ABI,
        functionName: "withdraw",
        args: [walletAddress],
        account: walletAddress,
        chain: currentChain,
      });

      // 保存提现交易 hash。
      setWithdrawTxHash(hash);
      
      // 交易已经发出，正在等待链上确认。
      setWithdrawStatus("pending");

      await publicClient.waitForTransactionReceipt({ hash});

      setWithdrawStatus("confirmed");

      // 提现成功后，重新读取合约余额。
      await handleLoadContractBalance();

    }catch(error){
      console.error("Failed to withdraw:", error);

      setWithdrawStatus("failed");

      setMembershipError("Failed to withdraw")
    }
  }

  // 判断当前钱包是否为 owner；toLowerCase 用来忽略地址大小写差异。
  const isCurrentWalletOwner = walletAddress !== null &&
    contractOwnerAddress !== null &&
    walletAddress.toLowerCase() === contractOwnerAddress.toLowerCase();


  // 组件挂载后添加钱包事件监听。
  useEffect(() =>{
    // 如果没有 MetaMask，就直接结束。
    if (window.ethereum === undefined) {
      return;
    }

    // 如果钱包不支持 on() 监听方法，也直接结束。
    if(window.ethereum.on === undefined) {
      return;
    }

    // 处理钱包账户切换。
    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = accounts as string[];

      // 如果没有账户，说明用户断开了网站和钱包的连接。
      if( nextAccounts.length === 0){
        setWalletAddress(null);
        setAccessState("locked");
        setMembershipExpiresAtText("");
        return;
      }
      
      // 如果账户存在，就使用第一个账户。
      setWalletAddress(nextAccounts[0] as Address);
    };

    // 处理网络切换。
    const handleChainChanged = (chainIdHex: unknown) => {

      // 把 MetaMask 给的十六进制 chainId 转成普通数字。
      const nextChainId = Number.parseInt(chainIdHex as string, 16);

      setCurrentChainId(nextChainId);
      setAccessState("locked");
      setMembershipExpiresAtText("");
      setMembershipPrice("");
      setMembershipPriceRaw(null);
      setContractOwnerAddress(null);
      setContractBalance("");
      setMembershipError(null);
      setPurchaseStatus("idle");
      setWithdrawStatus("idle");

      setPurchaseTxHash("");
      setWithdrawTxHash("");

    };

    // 监听 accountsChanged；账户变化时执行 handleAccountsChanged。
    window.ethereum.on("accountsChanged", handleAccountsChanged);

    // 监听 chainChanged；网络变化时执行 handleChainChanged。
    window.ethereum.on("chainChanged", handleChainChanged);

    // 组件卸载时清理监听，避免重复绑定事件。
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);

      // 页面卸载时，也取消 chainChanged 监听。
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  // 网络和合约地址准备好后，自动读取 price / owner / balance。
  // 当 membershipLockAddress 或 publicClient 变化时，自动读取 price。
  useEffect(() => {
    if (membershipLockAddress === null || publicClient === null){
      setMembershipPrice("");
      setMembershipPriceRaw(null);
      return;
    }

    // void 表示只执行异步函数，不在这里等待返回值。
    void handleLoadPrice();
  }, [membershipLockAddress, publicClient]);


  useEffect(() => {
    if (membershipLockAddress === null || publicClient === null){
      setContractOwnerAddress(null);
      return;
    }

    void handleLoadOwner();
  }, [membershipLockAddress, publicClient]);


  useEffect(() => {
  if (membershipLockAddress === null || publicClient === null) {
    setContractBalance("");
    return;
  }

  void handleLoadContractBalance();
}, [membershipLockAddress, publicClient]);


// 当钱包、合约地址或读链工具变化时，自动检查当前钱包会员状态。
useEffect(() => {
  if (walletAddress === null){
    setAccessState("locked");
    setMembershipExpiresAtText("");
    return;
  }

  if(membershipLockAddress === null || publicClient === null){
    setAccessState("locked");
    setMembershipExpiresAtText("");
    return;
  }

  void handleCheckMembership();
}, [walletAddress, membershipLockAddress, publicClient]);

// 当钱包、合约地址或读链工具变化时，自动读取 ACL/RBAC/ABAC 访问结果。
useEffect(() => {
  if (walletAddress === null) {
    setAclAllowed(null);
    setRbacAllowed(null);
    setAbacAllowed(null);
    return;
  }

  if (membershipLockAddress === null || publicClient === null) {
    setAclAllowed(null);
    setRbacAllowed(null);
    setAbacAllowed(null);
    return;
  }

  void handleLoadAccessDecision();
}, [walletAddress, membershipLockAddress, publicClient]);

// 格式化访问控制结果的显示文本。
function formatAccessResult(value: boolean | null) {
  if (value === null) {
    return "not loaded";
  }

  return value ? "Allowed" : "Denied";
}


// JSX 页面结构。
  return (
    <main className="app-shell">
    <header className="app-header">
      <div>
        <h1>Unlock Mini DApp</h1>
        <p className="app-subtitle">Membership access control demo</p>
      </div>

      <button type="button" onClick={handleConnectWallet}>
        Connect Wallet
      </button>
    </header>

    <section className="panel">
      <div className="panel-header">
        <h2>Connection Status</h2>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <span className="status-label">Wallet</span>
          <span className="status-value address">
            {walletAddress ?? "not connected"}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Network chainId</span>
          <span className="status-value">
            {currentChainId ?? "not loaded"}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Contract address</span>
          <span className="status-value address">
            {membershipLockAddress ?? "not available"}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Contract owner</span>
          <span className="status-value address">
            {contractOwnerAddress ?? "not loaded"}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Current wallet is owner</span>
          <span className="status-value">
            {walletAddress === null || contractOwnerAddress === null
              ? "not checked"
              : isCurrentWalletOwner
                ? "yes"
                : "no"}
          </span>
        </div>
      </div>

  {/* 条件渲染：只有 isUnsupportedNetwork 为 true 时，才显示这个错误提示。 */}
  {isUnsupportedNetwork && (
    <p className="error-message">Unsupported network</p>
  )}
</section>

      {isCurrentWalletOwner && (
        <>
          <section className="panel target-panel">
            <div className="panel-header">
              <h2>Target Access Control</h2>
            </div>

            <label className="form-field">
              <span>Target address</span>
              <input
                type="text"
                value={targetAddress}
                onChange={(event) => setTargetAddress(event.target.value)}
                placeholder="0x..."
              />
            </label>

            <div className="access-grid">
              <div className="access-card">
                <span className="access-label">Target ACL Access</span>
                <strong
                  className={
                    targetAclAllowed === null
                      ? "access-value access-muted"
                      : targetAclAllowed
                        ? "access-value access-allowed"
                        : "access-value access-denied"
                  }
                >
                  {formatAccessResult(targetAclAllowed)}
                </strong>
              </div>

              <div className="access-card">
                <span className="access-label">Target RBAC Access</span>
                <strong
                  className={
                    targetRbacAllowed === null
                      ? "access-value access-muted"
                      : targetRbacAllowed
                        ? "access-value access-allowed"
                        : "access-value access-denied"
                  }
                >
                  {formatAccessResult(targetRbacAllowed)}
                </strong>
              </div>

              <div className="access-card">
                <span className="access-label">Target ABAC Access</span>
                <strong
                  className={
                    targetAbacAllowed === null
                      ? "access-value access-muted"
                      : targetAbacAllowed
                        ? "access-value access-allowed"
                        : "access-value access-denied"
                  }
                >
                  {formatAccessResult(targetAbacAllowed)}
                </strong>
              </div>
            </div>

            {/* 手动刷新 targetAddress 的访问结果。 */}
            <div className="button-row">
              <button
                type="button"
                onClick={handleLoadTargetAccessDecision}
                disabled={isCheckingTargetAccessDecision}
              >
                {isCheckingTargetAccessDecision ? "Checking Target..." : "Refresh Target Access"}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Owner Actions</h2>
            </div>

            <div className="owner-action-grid">
              <div className="action-group">
                <h3>ACL Actions</h3>
                <div className="button-row">
                  <button type="button" onClick={handleAddToAcl}>
                    Add to ACL
                  </button>

                  <button type="button" onClick={handleRemoveFromAcl}>
                    Remove from ACL
                  </button>
                </div>
              </div>

              <div className="action-group">
                <h3>RBAC Actions</h3>
                <div className="button-row">
                  <button type="button" onClick={handleGrantOperatorRole}>
                    Grant OPERATOR_ROLE
                  </button>

                  <button type="button" onClick={handleRevokeOperatorRole}>
                    Revoke OPERATOR_ROLE
                  </button>
                </div>
              </div>

              <div className="action-group">
                <h3>Membership</h3>
                <div className="button-row">
                  <button type="button" onClick={handleGrantMembership}>
                    Grant Membership
                  </button>
                </div>
              </div>

              <div className="action-group">
                <h3>ABAC Attributes</h3>
                <div className="form-grid">
                  <label className="form-field compact-field">
                    <span>KYC level</span>
                    <input
                      type="number"
                      value={kycLevelInput}
                      onChange={(event) => setKycLevelInput(event.target.value)}
                    />
                  </label>

                  <label className="form-field compact-field">
                    <span>Risk score</span>
                    <input
                      type="number"
                      value={riskScoreInput}
                      onChange={(event) => setRiskScoreInput(event.target.value)}
                    />
                  </label>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={bannedInput}
                      onChange={(event) => setBannedInput(event.target.checked)}
                    />
                    <span>Banned</span>
                  </label>
                </div>

                <div className="button-row">
                  <button type="button" onClick={handleSetAbacAttributes}>
                    Set ABAC
                  </button>
                </div>
              </div>
            </div>

            <div className="status-strip">
              <span>Owner action status: {ownerActionStatus}</span>
              <span className="address">Owner action tx: {ownerActionTxHash ?? "none"}</span>
            </div>
          </section>
        </>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>Current Wallet Access</h2>
        </div>

        <p>Current status: {accessState}</p>

        <div className="access-grid">
          <div className="access-card">
            <span className="access-label">ACL Access</span>
            <strong
              className={
                aclAllowed === null
                  ? "access-value access-muted"
                  : aclAllowed
                    ? "access-value access-allowed"
                    : "access-value access-denied"
              }
            >
              {formatAccessResult(aclAllowed)}
            </strong>
          </div>

          <div className="access-card">
            <span className="access-label">RBAC Access</span>
            <strong
              className={
                rbacAllowed === null
                  ? "access-value access-muted"
                  : rbacAllowed
                    ? "access-value access-allowed"
                    : "access-value access-denied"
              }
            >
              {formatAccessResult(rbacAllowed)}
            </strong>
          </div>

          <div className="access-card">
            <span className="access-label">ABAC Access</span>
            <strong
              className={
                abacAllowed === null
                  ? "access-value access-muted"
                  : abacAllowed
                    ? "access-value access-allowed"
                    : "access-value access-denied"
              }
            >
              {formatAccessResult(abacAllowed)}
            </strong>
          </div>
        </div>

      {/* 手动重新读取当前钱包的访问控制结果。 */}
        <div className="button-row">
          <button
            type="button"
            onClick={handleLoadAccessDecision}
            disabled={isCheckingAccessDecision}
          >
            {isCheckingAccessDecision ? "Checking Access..." : "Refresh Access"}
          </button>
        </div>
      </section>
      
      {/* 使用模板字符串把会员价格拼成 ETH 显示文本。 */}
      <section className="panel">
        <div className="panel-header">
          <h2>Membership</h2>
        </div>

        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Membership price</span>
            <span className="status-value">
              {membershipPrice === "" ? "not loaded" : `${membershipPrice} ETH`}
            </span>
          </div>

      {/* 显示当前钱包的会员到期时间。 */}
          <div className="status-item">
            <span className="status-label">Membership expires at</span>
            <span className="status-value">
              {membershipExpiresAtText === "" ? "not loaded" : membershipExpiresAtText}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">Purchase status</span>
            <span className="status-value">{purchaseStatus}</span>
          </div>
        </div>

        {/* 只有 purchaseTxHash 不为空时，才显示购买交易 hash；Sepolia 上可跳转 Etherscan。 */}
        {purchaseTxHash !== "" &&(
          <p className="hash-line">Transaction hash: <span className="address">{purchaseTxHash}</span>
          {etherscanBaseUrl !== null &&(
            <>
            {" "}
            <a
              href={`${etherscanBaseUrl}/tx/${purchaseTxHash}`}
              target='_blank'
              rel="noreferrer"
              >
                View on Etherscan
              </a>
            </>
          )}
            </p>
        )}

        <div className="button-row">
          {/* 如果 isCheckMembership 为 true，就禁用检查会员按钮。 */}
          <button type="button" onClick={handleCheckMembership}
          disabled={isCheckMembership}
          >
            {isCheckMembership ? "Check..." : "Check Membership"}
          </button>
          {/* 根据 isCheckMembership 决定按钮文字：检查中显示 Check...，否则显示 Check Membership。 */}

          {/* disabled 控制按钮是否禁用，表达式结果是 true 或 false。 */}
          <button type='button'
          onClick={handlePurchaseMembership}
          disabled = {purchaseStatus === "waitingWallet" || purchaseStatus === "pending"}>
            {purchaseStatus === "waitingWallet" || purchaseStatus === "pending"
            ? "Purchasing..."
            : "Purchase Membership"}

          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Contract Admin</h2>
        </div>

        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Contract balance</span>
            <span className="status-value">
              {contractBalance === "" ? "not loaded" : `${contractBalance} ETH`}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">Withdraw status</span>
            <span className="status-value">{withdrawStatus}</span>
          </div>
        </div>

        {/* 只有 withdrawTxHash 存在时，才显示提现交易 hash。 */}
        {withdrawTxHash !== "" && (
          <p className="hash-line">Withdraw transaction hash: <span className="address">{withdrawTxHash}</span>
          {etherscanBaseUrl !== null && (
        <>
          {" "}
          <a
            href={`${etherscanBaseUrl}/tx/${withdrawTxHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Etherscan
          </a>
        </>
        )}
          </p>
        )}

        <div className="button-row">
          {/* 只有当前钱包是 owner 时，才显示 Withdraw 按钮。 */}
          {isCurrentWalletOwner && (
            <button
              type='button'
              onClick={handleWithdraw}
              disabled={withdrawStatus === "waitingWallet" || withdrawStatus === "pending" }>

            {withdrawStatus === "waitingWallet" || withdrawStatus === "pending"
                ? "Withdrawing..."
                : "Withdraw"}
              </button>
          )}

          {/* 按钮传函数名，不要在这里直接调用函数。 */}
          <button type='button' onClick={handleLoadOwner}>
            Load Owner
          </button>

          <button type='button' onClick={handleLoadContractBalance}>
            Load Contract Balance
          </button>

          <button type="button" onClick = {handleLoadPrice}>
            Load Price
          </button>
        </div>
      </section>

      {/* React 里 && 可以做条件显示：左边为 true 时才显示右边。 */}
      {/* 如果 walletError 或 membershipError 不为 null，就显示错误消息。 */}
      {(walletError !== null || membershipError !== null) && (
        <section className="panel message-panel">
          <div className="panel-header">
            <h2>Messages</h2>
          </div>

          {walletError !== null && <p className="error-message">{walletError}</p>}
          {membershipError !== null && <p className="error-message">{membershipError}</p>}
        </section>
      )}
    </main>
  )
}

export default App

/* 早期测试按钮示例：点击后手动把 accessState 改成 unlocked。
        Check Membership
      </button> */
  
