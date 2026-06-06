//whether can access 先假设用户可以访问
//const canAccess = false;
const canAccess = true;

//获取访问状态, 使用访问值value
function getAccessState(canAccessValue){
    if(canAccessValue === true){
        return{
            status:"unlocked",
            message:"Access granted."
        };
    }else{
        return{
            status:"locked",
            message:"Please purchase a key."
        };
    }

}
const accessState = getAccessState(canAccess);

console.log("canAccess:", canAccess);
//print 返回对象
console.log("accessState:", accessState);
