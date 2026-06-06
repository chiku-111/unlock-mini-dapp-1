
//multiple users access membership content 
const today = "2026-04-27"

const users =[
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

//判断是否过期 expired is true 
function isMembershipExpired(user, currentDate){
    if(user.membershipExpiresAt === null){
        return true;
    }else{
        return user.membershipExpiresAt < currentDate;
    }
}

//whether can access
function canAccess(user, currentDate){
    const userHasMembership = user.hasMembership === true;
    const isExpired = isMembershipExpired(user, currentDate);

    return userHasMembership && !isExpired;
}

//true & false transfer to locked & unlocked
function getAccessState(canAccessValue){
    if(canAccessValue === true){
        return "unlocked";
    }else{
        return "locked";
    }
}

//循环 对每个用户判断unlocked/locked
for(const oneUser of users){
    const access = canAccess(oneUser, today);
    const state = getAccessState(access);

    console.log(oneUser.name, state);
}

