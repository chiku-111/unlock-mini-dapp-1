//useState状态变化 locked/unlocked
import { useState } from 'react'

import { 
  createPublicClient,
  createWalletClient,
  custom,
  http, 
  parseEther,   //ETH 转成 wei
  formatEther,  //把链上 wei 转成人类可读 ETH 字符串
  type Address 
} from 'viem';
import { hardhat } from "viem/chains";

// 引入 MembershipLock 合约的 ABI
import { MEMBERSHIP_LOCK_ABI } from "./abi/MembershipLockAbi";

// 这个地址告诉前端：合约部署在哪里
import { MEMBERSHIP_LOCK_ADDRESS } from "./config";

import './App.css'


type AccessState = "locked" | "unlocked";

// EthereumProvider = MetaMask 注入的 ethereum 对象起的类型名字
type EthereumProvider = {
  //eth_requestAccounts : 请求用户授权当前网站访问钱包账户
  //
  request: (args: {method: string; params?: unknown[]}) => Promise<unknown>;
};

//扩展全局 Window 类型。告诉ts : window 上可能存在 ethereum
declare global {
    interface Window {

      //? 可能存在 可能不存在
    ethereum?: EthereumProvider;
    }
  }

  // publicClient 用来读取链上公开数据，不需要钱包签名

  const publicClient = createPublicClient({
    chain: hardhat,

      // 指定 RPC 地址。
    transport: http("http://127.0.0.1:8545"),
  });
  

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

  setWalletAddress(accounts[0]  as Address);} catch {
    setWalletError("Failed to connect wallet");
  }
}

//前端从链上 MembershipLock 合约读取会员价格 price, 并显示在页面上。
async function handleLoadPrice() {
  setMembershipError(null);

  //尝试执行读取链上数据的代码, 如果失败就进入 catch
  
  try{
    // @ts-ignore viem type inference is stricter than this local demo needs.
    const price = await publicClient.readContract({
      address: MEMBERSHIP_LOCK_ADDRESS as Address,
      abi: MEMBERSHIP_LOCK_ABI,
      functionName: "price",
    });

    console.log("Raw price in wei:", price);
    console.log("Formatted price in ETH:", formatEther(price));

    //把 price 从 wei 转成 ETH 字符串, 并保存到 React 状态
    setMembershipPrice(formatEther(price));

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
    setIsCheckingMembership(true);

    try{
      // @ts-ignore viem type inference is stricter than this local demo needs.
      const isMember = await publicClient.readContract({
        //not walletAddress, is contract address: 去哪里查
        address: MEMBERSHIP_LOCK_ADDRESS as Address,
        abi: MEMBERSHIP_LOCK_ABI,
        functionName: "hasValidMembership",
        //walletAddress: 查谁
        args: [walletAddress as Address],
      });

      setAccessState(isMember ? "unlocked" : "locked");
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
      try{
        //用来创建一个钱包客户端
        const walletClient = createWalletClient({
          chain: hardhat,
          transport: custom(window.ethereum),
        });
        const hash = await walletClient.writeContract({
          address: MEMBERSHIP_LOCK_ADDRESS as Address,
          abi: MEMBERSHIP_LOCK_ABI,
          functionName: "purchaseMembership",
          account: walletAddress,
          chain: hardhat,

          //调用 purchaseMembership 时，附带 0.01 ETH
          value: parseEther("0.01"),
        });
        //waitForTransactionReceipt: 等待交易收据
        await publicClient.waitForTransactionReceipt({hash});
        await handleCheckMembership();
      } catch (error) {
        setMembershipError("Failed to purchase membership");
      }
    }


//JSX
  return (
    <main>
      <h1>Unlock Mini DApp</h1>

      {/*If left is null - not connected, else left*/}
      <p>Wallet: {walletAddress ?? "not connected"}</p> 

    {/*react 中 && 可以条件显示 true就显示右边, false不显示*/}
    {/* 如果 walletError 不是 null, 就显示错误信息 */}
      
      {walletError !== null && <p>{walletError}</p>}
      {membershipError !== null && <p>{membershipError}</p>}

      <p>Current status: {accessState}</p>
      
      {/*`${membershipPrice} ETH`= JavaScript模板字符串*/}
      <p>Membership price: {membershipPrice === "" ? "not loaded" : `${membershipPrice} ETH`}</p>

      <button type="button" onClick = {handleLoadPrice}>
        Load Price
      </button>

      <button type="button" onClick={handleCheckMembership}
      //if isCheckMembership is true, 按钮禁用
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

      <button type='button' onClick={handlePurchaseMembership}>
        Purchase Membership
      </button>
    </main>
  )
}

export default App

/*<button type="button" onClick = {() => setAccessState("unlocked")}>
        Check Membership
      </button> */
  
