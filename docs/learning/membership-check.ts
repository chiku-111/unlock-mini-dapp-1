//独立模块 不放全局作用域
export{};
const today: string ="2026-04-28";


//define user type
type MembershipUser = {
    name: string;
    hasMembership: boolean;
    membershipExpiresAt: string | null;
};

//define access state
type AccessState = "locked" | "unlocked";

//users 数组
const users: MembershipUser[] = [
    {
        name: "Shen-san",
        hasMembership: true,
        membershipExpiresAt: "2026-12-31",
    },
    {
        name: "xxx",
        hasMembership: false,
        membershipExpiresAt: null,
    },
    {
        name: "Alice",
        hasMembership: true,
        membershipExpiresAt: "2026-01-01",
    },
];

//whether membership is expired
function isMembershipExpired(
    user: MembershipUser,
    currentDate: string,
): boolean{
    if(user.membershipExpiresAt === null){
        return true;
    }else{
        return user.membershipExpiresAt < currentDate;
    }
}

//whether  access
function canAccess(
    user: MembershipUser,
    currentDate: string,
): boolean {
    const userHasMembership: boolean = user.hasMembership === true;
//复用isMembershipExpired函数  
    const membershipIsExpired: boolean = isMembershipExpired(user, currentDate);

    return userHasMembership && !membershipIsExpired;
}

//get  access state
function getAccessState(canAccessValue: boolean): AccessState{
    if (canAccessValue === true){
        return "unlocked";
    }else{
        return "locked";
    }
}

//多用户 循环 
for(const oneUser of users){
    const access: boolean = canAccess(oneUser, today);
    const state: AccessState = getAccessState(access);

    console.log(oneUser, state);
}