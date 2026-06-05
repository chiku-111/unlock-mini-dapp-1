//useState状态变化 locked/unlocked
import { useState, useEffect , useMemo } from 'react'

import { 
  createPublicClient,
  createWalletClient,
  custom,
  http, 
 // parseEther,   //ETH 转成 wei
  formatEther,  //把链上 wei 转成人类可读 ETH 字符串
  type Address, 
} from 'viem';

import { hardhat, sepolia } from "viem/chains";

// 引入 MembershipLock 合约的 ABI
import { MEMBERSHIP_LOCK_ABI } from "./abi/MembershipLockAbi";

// 根据 chainId 找 deployment
import { getDeploymentByChainId } from "./deployments";

type AccessState = "locked" | "unlocked";

//idle: 空闲还没开始购买 or 等钱包确认 or 交易已发送,正等链上确认 
type PurchaseStatus = "idle" | "waitingWallet" | "pending" | "confirmed" | "failed";

//提现状态类型
type WithdrawStatus = "idle" | "waitingWallet" | "pending" | "confirmed" | "failed";

// EthereumProvider = MetaMask 注入的 ethereum 对象起的类型名字
type EthereumProvider = {
  //eth_requestAccounts : 请求用户授权当前网站访问钱包账户
  request: (args: {method: string; params?: unknown[]}) => Promise<unknown>;
  //on: 监听, removeListener: 取消监听
  on? : (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeListener? : (eventName: string, handler: (...args: unknown[]) => void) => void;
};



//扩展全局 Window 类型。告诉ts : window 上可能存在 ethereum
declare global {
    interface Window {

      //? 可能存在 可能不存在
    ethereum?: EthereumProvider;
    }
  }

  // publicClient 用来读取链上公开数据，不需要钱包签名

  /*const publicClient = createPublicClient({
    chain: hardhat,

      // 指定 RPC 地址。
    transport: http("http://127.0.0.1:8545"),
  });*/

 /* const currentDeployment = getDeploymentByChainId(31337);

  if(currentDeployment === null){
    throw new Error("Missing local deployment for chainId 31337");
  }

  const membershipLockAddress = currentDeployment.membershipLock as Address;*/
  

// 创建一个页面状态 accessState: 初始值是 "locked"
// setAccessState 用来修改这个状态，修改后 React 会自动刷新页面

function App() {
const [accessState, setAccessState] = useState<AccessState>("locked");
//保存从合约 price() 读取到的会员价格, 初始值为空字符串表示还没有加载
const [membershipPrice, setMembershipPrice] = useState<string>("");
const [walletAddress, setWalletAddress]= useState<Address | null>(null);
//保存连接钱包时的错误信息。初始为null
const [walletError, setWalletError]= useState<string | null>(null);
const [membershipError, setMembershipError] = useState<string | null>(null);
//当前是否正在检查会员状态:isCheckMembership
const [isCheckMembership, setIsCheckingMembership] = useState(false);
//保存会员到期时间的显示文字
const [membershipExpiresAtText, setMembershipExpiresAtText] = useState<string>("");
//会员价格的链上原始值
const[membershipPriceRaw,  setMembershipPriceRaw] = useState<bigint | null>(null);
//创建购买状态,默认是 idle
const[purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("idle");
//保存购买交易的 hash ,开始未交易, 空字符串。
const[purchaseTxHash, setPurchaseTxHash] = useState<string>("");
//
const [contractOwnerAddress, setContractOwnerAddress] = useState<Address | null>(null);
//合约余额
const [contractBalance, setContractBalance] = useState<string>("");

const [withdrawStatus, setWithdrawStatus] = useState<WithdrawStatus>("idle");

//保存提现交易 hash; 开始无交易, 空字符串
const [withdrawTxHash, setWithdrawTxHash] = useState<string>("");

//当前网络ID
const [currentChainId, setCurrentChainId] = useState<number |null>(null);

//如果知道 chainId, 就根据 chainId 查 deployment
const currentDeployment = currentChainId === null ? null : getDeploymentByChainId(currentChainId);

//如果有 deployment, 就取 membershipLock 地址
const membershipLockAddress = currentDeployment === null ? null : (currentDeployment.membershipLock as Address);

//如果已经知道 chainId, 但找不到 deployment = 不支持的网络
const isUnsupportedNetwork = currentChainId !== null && currentDeployment === null;

//Etherscan 基础地址
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

//useMemo:如果依赖没变, 就不要重新计算
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

  //从 Vite 环境变量中读取 Sepolia RPC URL
  const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;

  if(sepoliaRpcUrl === undefined) {
    return null;
  }

  return createPublicClient({
    chain: currentChain,
    transport: http(sepoliaRpcUrl),
  });
}, [currentChain, currentChainId]);


//读取 MetaMask 当前网络 chainId
async function handleLoadChainId() {
  setWalletError(null);

  if (window.ethereum === undefined) {
    setWalletError("MetaMask is not installed");
    return;
  }

  //chainIdHex: MetaMask 返回的 chainId 是十六进制字符串
  try {
    const chainIdHex = await window.ethereum.request({
      method: "eth_chainId",
    }) as string;

    //把十六进制字符串转换成十进制数字
    const chainId = Number.parseInt(chainIdHex, 16);

    setCurrentChainId(chainId);

  } catch (error) {
    console.log("Failed to read chainId:", error);

    setWalletError("Failed to read network");

  }
  
}

async function handleConnectWallet(){
  //每次重新连接钱包前，先清空旧错误
  setWalletError(null);
  if (window.ethereum === undefined){
    setWalletError("MetaMask is not installed");
    return;
  }

  //请求用户授权当前网站访问钱包账户

  try {
    const accounts = await window.ethereum.request({
    method: "eth_requestAccounts"
  }) as string[];

  setWalletAddress(accounts[0]  as Address);

  //读取当前 MetaMask 网络 chainId
  await handleLoadChainId();

} catch {
    setWalletError("Failed to connect wallet");
  }
}

//去链上读取 owner(), 然后把结果放进 contractOwnerAddress, 管理员地址
async function handleLoadOwner () {
  setMembershipError(null);

  //如果没有合约地址, 或者没有 publicClient, 就停止
  if (membershipLockAddress === null || publicClient === null) {
    setMembershipError("Unsupported network");
    return;
  }

  try{
    // @ts-ignore viem type inference is stricter than this local demo needs.
    const owner = await publicClient.readContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "owner",
    });

    //刚才读到的 owner 地址放进 React state
    setContractOwnerAddress(owner as Address);
  }catch(error){
    console.error("Failed to read contract owner:", error);
  }
  
}

//处理读取合约余额这件事
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

//前端从链上 MembershipLock 合约读取会员价格 price, 并显示在页面上。
async function handleLoadPrice() {
  setMembershipError(null);

if (membershipLockAddress === null || publicClient === null) {
  setMembershipError("Unsupported network");
  return;
}

  //尝试执行读取链上数据的代码, 如果失败就进入 catch
  
  try{
    // @ts-ignore viem type inference is stricter than this local demo needs.
    const price = await publicClient.readContract({
      address: membershipLockAddress,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "price",
    });

    console.log("Raw price in wei:", price);
    console.log("Formatted price in ETH:", formatEther(price));

    //把 price 从 wei 转成 ETH 字符串, 并保存到 React 状态
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

    //用户点击 Check Membership 的流程里
    setMembershipError("Please connect wallet first");

  //立刻结束handleCheckMembership 函数
    return;
  }
  
if (membershipLockAddress === null || publicClient === null) {
  setMembershipError("Unsupported network");
  return;
}
    setIsCheckingMembership(true);

    try{
      // @ts-ignore viem type inference is stricter than this local demo needs.
      const isMember = await publicClient.readContract({
        //not walletAddress, is contract address: 去哪里查
        address: membershipLockAddress,
        abi: MEMBERSHIP_LOCK_ABI,
        functionName: "hasValidMembership",
        //walletAddress: 查谁
        args: [walletAddress as Address],
      });

      setAccessState(isMember ? "unlocked" : "locked");

      // @ts-ignore viem type inference is stricter than this local demo needs.
      const expiresAt = await publicClient.readContract({
        address: membershipLockAddress,
        abi: MEMBERSHIP_LOCK_ABI,
        functionName: "membershipExpiresAt",
        args: [walletAddress as Address],
      });

      if(expiresAt === 0n){
        setMembershipExpiresAtText("not set"); //显示: 没有设置
        
      }else{
        //把链上的秒级时间戳转换成JS可理解的日期对象,毫秒
        const expiresAtDate = new Date(Number(expiresAt) * 1000);

        //.toLocaleString 把日期对象转换成本地格式的字符串
        setMembershipExpiresAtText(expiresAtDate.toLocaleString());
      }

    }catch {
      setMembershipError("Fail to read Membership from contract");

      setAccessState("locked");
    }finally {
      //查询结束
      setIsCheckingMembership(false);
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
        //购买流程开始了, 现正等待用户在 MetaMask 里确认
        setPurchaseStatus("waitingWallet");
        //清空上一次交易hash
        setPurchaseTxHash("");

        //用来创建一个钱包客户端
        const walletClient = createWalletClient({
          chain: currentChain,
          transport: custom(window.ethereum),
        });

        //writeContract: 发送一笔写合约交易
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

        //waitForTransactionReceipt: 等待交易收据
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
      //清空上一次提现交易 hash
      setWithdrawTxHash("");

      const walletClient = createWalletClient({
        chain: currentChain,
        //用浏览器钱包提供的 provider 发送请求
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

      //把提现交易 hash 保存
      setWithdrawTxHash(hash);
      
      //交易已经发出，正在等待链上确认
      setWithdrawStatus("pending");

      await publicClient.waitForTransactionReceipt({ hash});

      setWithdrawStatus("confirmed");

      //提现成功后, 合约余额应该变化
      await handleLoadContractBalance();

    }catch(error){
      console.error("Failed to withdraw:", error);

      setWithdrawStatus("failed");

      setMembershipError("Failed to withdraw")
    }
  }

  //当前钱包是否为owner, .toLowerCase表示地址变小写
  const isCurrentWalletOwner = walletAddress !== null &&
    contractOwnerAddress !== null &&
    walletAddress.toLowerCase() === contractOwnerAddress.toLowerCase();

  //加入监听, 给 useEffect 一个函数, React 会在合适的时候执行
  useEffect(() =>{
    //如果没有 MetaMask, 就直接结束
    if (window.ethereum === undefined) {
      return;
    }

    //如果当前钱包没有 on 这个监听方法, 也直接结束
    if(window.ethereum.on === undefined) {
      return;
    }

    //处理账号切换
    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = accounts as string[];

      //如果数组长度是 0, 说明用户断开了网站和钱包的连接
      if( nextAccounts.length === 0){
        setWalletAddress(null);
        setAccessState("locked");
        setMembershipExpiresAtText("");
        return;
      }
      
      //如果账号数组不是空的, 就取第一个账号
      setWalletAddress(nextAccounts[0] as Address);
    };

    // 处理网络变化
    const handleChainChanged = (chainIdHex: unknown) => {

      //把 MetaMask 给的十六进制 chainId 转成普通数字
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

    //MetaMask 监听 accountsChanged 事件; 当账号变化时, 执行 handleAccountsChanged函数
    window.ethereum.on("accountsChanged", handleAccountsChanged);

    //当网络变化时, 执行 handleChainChanged
    window.ethereum.on("chainChanged", handleChainChanged);

    //当这个组件卸载时, 执行这个函数做清理, 把 accountsChanged 事件上绑定的 handleAccountsChanged 函数移除掉
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);

      //页面卸载时，把 chainChanged 监听也取消掉
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  //网络和合约地址准备好后, 自动读取 price / owner / balance
  //membershipLockAddress 或 publicClient 变化时, 自动执行读取 price 的逻辑
  useEffect(() => {
    if (membershipLockAddress === null || publicClient === null){
      setMembershipPrice("");
      setMembershipPriceRaw(null);
      return;
    }

    //void 只要执行 不需要拿回它返回结果
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


//当钱包、合约地址、读链工具准备好或发生变化时, 自动检查当前钱包的会员状态
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


//JSX
  return (
    <main>
      <h1>Unlock Mini DApp</h1>

      {/*If left is null - not connected, else left*/}
      <p>Wallet: {walletAddress ?? "not connected"}</p> 

      <p>Network chainId: {currentChainId ?? "not loaded"}</p>

      {/*只有 isUnsupportedNetwork 为 true 时, 才显示 Unsupported network*/}
      {isUnsupportedNetwork && (
        <p>Unsupported network</p>
      )}

      <p>Contract address: {membershipLockAddress ?? "not available"}</p>

      {/* contractOwnerAddress 管理员地址 */}
      <p>Contract owner: {contractOwnerAddress ?? "not loaded"}</p>

      <p>
        Current wallet is owner:{""}
        {walletAddress === null || contractOwnerAddress === null
        ? "not checked"
        : isCurrentWalletOwner
          ? "yes"
          : "no"}
      </p>

      <p>
        Contract balance:{""}
        {contractBalance === "" ? "not loaded" : `${contractBalance} ETH`}
      </p>

    {/*react 中 && 可以条件显示 true就显示右边, false不显示*/}
    {/* 如果 walletError 不是 null, 就显示错误信息 */}
      
      {walletError !== null && <p>{walletError}</p>}
      {membershipError !== null && <p>{membershipError}</p>}

      <p>Current status: {accessState}</p>
      
      {/*`${membershipPrice} ETH`= JavaScript模板字符串*/}
      <p>Membership price: {membershipPrice === "" ? "not loaded" : `${membershipPrice} ETH`}</p>

      {/* 显示当前钱包的会员到期时间 */}
      <p>Membership expires at:{" "}
        {membershipExpiresAtText === "" ? "not loaded" : membershipExpiresAtText}
      </p>

      <p>Purchase status: {purchaseStatus}</p>

      <p>Withdraw status: {withdrawStatus}</p>
      
      {/*只有提现交易 hash 存在时, 才显示*/}
      {withdrawTxHash !== "" && (
        <p>Withdraw transaction hash: {withdrawTxHash}
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

      {/*如果当前钱包是 owner, 才显示里面的按钮*/}
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


      
      {/*如果 purchaseTxHash 不是空字符串, 才显示后面, 点击后进入 Sepolia Etherscan*/}
      {purchaseTxHash !== "" &&(
        <p>Transaction hash: {purchaseTxHash}
        {etherscanBaseUrl !== null &&(
          <>
          {" "}
          <a
            href={'${etherscanBaseUrl}/tx/${purchaseTxHash}'}
            target='_blank'
            rel="noreferrer"
            >
              View on Etherscan
            </a>
          </>
        )}
          </p>
      )}

      {/* 按钮传函数名，不直接调用 */}
      <button type='button' onClick={handleLoadOwner}>
        Load Owner
      </button>

      <button type='button' onClick={handleLoadContractBalance}>
        Load Contract Balance  
      </button>

      <button type="button" onClick = {handleLoadPrice}>
        Load Price
      </button>

      {/*if isCheckMembership is true, 按钮禁用*/}
      <button type="button" onClick={handleCheckMembership}
      disabled={isCheckMembership}
      >
        {isCheckMembership ? "Check..." : "Check Membership"}
      </button>
      {/*if (isCheckMembership) {
           按钮文字 = "Checking..."
      } else {
           按钮文字 = "Check Membership"}*/}

        <button type="button" onClick={handleConnectWallet}>
        Connect Wallet
      </button>

      {/*disabled: 按钮是否禁用, return is true or false*/ }
      <button type='button' 
      onClick={handlePurchaseMembership}
      disabled = {purchaseStatus === "waitingWallet" || purchaseStatus === "pending"}>
        {purchaseStatus === "waitingWallet" || purchaseStatus === "pending"
        ? "Purchasing..."
        : "Purchase Membership"}
        
      </button>
    </main>
  )
}

export default App

/*<button type="button" onClick = {() => setAccessState("unlocked")}>
        Check Membership
      </button> */
  
