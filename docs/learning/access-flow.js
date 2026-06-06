const walletAddress ="0x1234...abcd";

const keyData = {
    owner: "0x1234...abcd",
    isValid: false,
    expirationDate: "2026-12-31",
};

//判断owner 单独封装成function
//const ownsKey = walletAddress === keyData.owner;
function isKeyOwner(wallet, key){
    return wallet === key.owner;
}

//检查key是否有效, 只需key自己的数据。
function isKeyValid(key){
    return key.isValid ===true;
}

//whether this wallet can access the content
function canAccessContent(inputwallet, inputkey){
    const ownsKey = isKeyOwner(inputwallet, inputkey);
    const keyIsValid = isKeyValid(inputkey);
    return ownsKey && keyIsValid;
}

//get access state, 外部结果canAccess 传入函数
function getAccessState(canAccessValue){
    if(canAccessValue === true){
        return{
            status: "unlocked",
            message:"Access granted."
        };
    }else{
        return{
            status:"locked",
            message:"Please perchase a key."
        };
    }
}

const ownsKey = isKeyOwner(walletAddress, keyData);
const keyIsValid = isKeyValid(keyData);
const canAccess = canAccessContent(walletAddress, keyData);
const accessState = getAccessState(canAccess);


console.log("walletAddress:", walletAddress);
console.log("keyData:", keyData);
console.log("ownsKey:", ownsKey);
console.log("keyIsValid:", keyIsValid);
console.log("canAccess:", canAccess);
console.log("accessState:", accessState);

/*1. 准备一个钱包地址
2. 准备一份 key 数据
3. 判断钱包是不是 key 的 owner
4. 判断 key 是否有效
5. 综合判断能不能访问内容
6. 把访问结果转换成 locked / unlocked 页面状态*/
