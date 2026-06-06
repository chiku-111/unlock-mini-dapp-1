
//假地址
const walletAddress = "0x1234...abcd";

const keyData = {
    owner: "0x1234...abcd",
    isValid: true,
    expirationDate: "2026-12-31",
};

//check key is belong wallet
function isKeyOwner(wallet, key){
    return wallet === key.owner;
}

//check key is owner, is vaild
function checkkeyStatus(wallet, key){
    const ownskey = isKeyOwner(wallet, key);
    const keyisValid = key.isValid === true;
    return ownskey && keyisValid;
}
//调用函数保存结果
const ownskeyResult = isKeyOwner(walletAddress, keyData);
const canAccessResult = checkkeyStatus(walletAddress, keyData);

console.log(walletAddress);
console.log(keyData);
console.log("ownskeyResult:", ownskeyResult);
console.log("canAccess:", canAccessResult);