// 现在假数据，没有连接真实钱包
const user={
    walletAddress:"0x1234...abcd",
    keyType:"member",
    hasKey:true,
    keyExpiresAt:"2026-12-31",
};

//need member type (key) can access
const lock={
    name:"Unlock club",
    requiredKeyType:"member",
    network:"Sepolia",//假设锁在s测试网,非真实链接
};

//能否访问内容
function canAccessContent(userInfo, lockInfo){
    const userhasKey = userInfo.hasKey === true;
    const keyTypematches = userInfo.keyType === lockInfo.requiredKeyType;
    return userhasKey && keyTypematches;
}; 

const canAccess = canAccessContent(user, lock);

console.log(user);
console.log(lock);
console.log("whether can access:", canAccess);
