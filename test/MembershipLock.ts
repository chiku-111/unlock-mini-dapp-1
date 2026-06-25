import { expect } from "chai";

import { network } from "hardhat";
// 引入 anyValue, 用来表示事件参数里""任意值都可以接受
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs"; 


//测试网络里拿 ethers, 用来部署合约、拿测试账户、调用合约/ networkHelpers测试里“快进区块链时间”
const { ethers, networkHelpers } = await network.create();

describe("MembershipLock", function(){
    //check "deployer.address == membershipLock.owner()"
    it("deployer should be owner", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [deployer] = await ethers.getSigners();
        //sol对public 变量自动生成读取函数, 外部可以调用owner();
        expect(await membershipLock.owner()).to.equal(deployer.address);
    });

    //ACL tests
    it("ACL: should deny access by default", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        expect(await membershipLock.canAccessByACL(user.address)).to.equal(false);
    });


    it("ACL: owner can add user to allowlist", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user] = await ethers.getSigners();

        await membershipLock.connect(owner).addToAcl(user.address);

        expect(await membershipLock.canAccessByACL(user.address)).to.equal(true);
    });

    it("ACL: owner can remove user from allowlist", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user] = await ethers.getSigners();

        await membershipLock.connect(owner).addToAcl(user.address);
        expect(await membershipLock.canAccessByACL(user.address)).to.equal(true);

        await membershipLock.connect(owner).removeFromAcl(user.address);
        expect(await membershipLock.canAccessByACL(user.address)).to.equal(false);
    });

    it("should return false by default", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");        
        const [, user] = await ethers.getSigners();
        expect(await membershipLock.hasValidMembership(user.address)).to.equal(false);
    });

    //ACL security tests
    it("ACL: non-owner cannot add user to allowlist", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        await expect(
            membershipLock.connect(user).addToAcl(user.address)
        ).to.be.revertedWith("Only owner");
    });

    it("ACL: non-owner cannot remove user from allowlist", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        await expect(
            membershipLock.connect(user).removeFromAcl(user.address)
        ).to.be.revertedWith("Only owner");
    });

    it("ACL: owner cannot add zero address to allowlist", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner] = await ethers.getSigners();

        await expect(
            membershipLock.connect(owner).addToAcl(ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid user");
    });

    it("ACL: owner cannot remove zero address from allowlist", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner] = await ethers.getSigners();

        await expect(
            membershipLock.connect(owner).removeFromAcl(ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid user");
    });

    //RBAC tests
    it("RBAC: should deny access by default", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        expect(await membershipLock.canAccessByRBAC(user.address)).to.equal(false);
});


    it("RBAC: owner can grant operator role", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    //从合约里读取 OPERATOR_ROLE 的真实 bytes32 值，并保存到 operatorRole 变量里
    const operatorRole = await membershipLock.OPERATOR_ROLE();

    await membershipLock.connect(owner).grantRole(operatorRole, user.address);

    expect(await membershipLock.hasRole(operatorRole, user.address)).to.equal(true);
    expect(await membershipLock.canAccessByRBAC(user.address)).to.equal(true);
});

    it("RBAC: owner can revoke operator role", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    const operatorRole = await membershipLock.OPERATOR_ROLE();

    await membershipLock.connect(owner).grantRole(operatorRole, user.address);
    await membershipLock.connect(owner).revokeRole(operatorRole, user.address);

    expect(await membershipLock.hasRole(operatorRole, user.address)).to.equal(false);
    expect(await membershipLock.canAccessByRBAC(user.address)).to.equal(false);
});


    //RBAC security tests
    it("RBAC: non-owner cannot grant role", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [, user] = await ethers.getSigners();

    const operatorRole = await membershipLock.OPERATOR_ROLE();

    await expect(
        membershipLock.connect(user).grantRole(operatorRole, user.address)
    ).to.be.revertedWith("Only owner");
});


    it("RBAC: non-owner cannot revoke role", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    const operatorRole = await membershipLock.OPERATOR_ROLE();

    await membershipLock.connect(owner).grantRole(operatorRole, user.address);

    await expect(
        membershipLock.connect(user).revokeRole(operatorRole, user.address)
    ).to.be.revertedWith("Only owner");
});


    it("RBAC: owner cannot grant role to zero address", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner] = await ethers.getSigners();

    const operatorRole = await membershipLock.OPERATOR_ROLE();

    await expect(
        membershipLock.connect(owner).grantRole(operatorRole, ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid user");
});

    //owner 不能对零地址执行 revokeRole
    it("RBAC: owner cannot revoke role from zero address", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner] = await ethers.getSigners();

    const operatorRole = await membershipLock.OPERATOR_ROLE();

    await expect(
        membershipLock.connect(owner).revokeRole(operatorRole, ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid user");
});

    //ABAC tests
    it("ABAC: should allow access when all conditions are met", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user] = await ethers.getSigners();

        const duration = 60 * 60;

        await membershipLock.connect(owner).grantMembership(user.address, duration);
        await membershipLock.connect(owner).setUserAttributes(user.address, 2, 30, false);

        expect(await membershipLock.canAccessByABAC(user.address)).to.equal(true);
    });

    //没有有效会员，不能访问
    it("ABAC: should deny access without valid membership", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    await membershipLock.connect(owner).setUserAttributes(user.address, 2, 30, false);

    expect(await membershipLock.canAccessByABAC(user.address)).to.equal(false);
});


    it("ABAC: should deny access when KYC level is too low", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    const duration = 60 * 60;

    await membershipLock.connect(owner).grantMembership(user.address, duration);
    await membershipLock.connect(owner).setUserAttributes(user.address, 1, 30, false);

    expect(await membershipLock.canAccessByABAC(user.address)).to.equal(false);
});

    it("ABAC: should deny access when risk score is too high", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    const duration = 60 * 60;

    await membershipLock.connect(owner).grantMembership(user.address, duration);
    await membershipLock.connect(owner).setUserAttributes(user.address, 2, 80, false);

    expect(await membershipLock.canAccessByABAC(user.address)).to.equal(false);
});

   
    it("ABAC: should deny access when user is banned", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    const duration = 60 * 60;

    await membershipLock.connect(owner).grantMembership(user.address, duration);
    await membershipLock.connect(owner).setUserAttributes(user.address, 2, 30, true);

    expect(await membershipLock.canAccessByABAC(user.address)).to.equal(false);
});

    //会员过期无法访问
    it("ABAC: should deny access after membership expires", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    const duration = 60;

    await membershipLock.connect(owner).grantMembership(user.address, duration);
    await membershipLock.connect(owner).setUserAttributes(user.address, 2, 30, false);

    expect(await membershipLock.canAccessByABAC(user.address)).to.equal(true);

    //增加区块链时间, 为了让会员过期
    await networkHelpers.time.increase(duration + 1);

    expect(await membershipLock.canAccessByABAC(user.address)).to.equal(false);
});

    //ABAC security tests
    it("ABAC: non-owner cannot set user attributes", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [, user] = await ethers.getSigners();

    await expect(
        membershipLock.connect(user).setUserAttributes(user.address, 2, 30, false)
    ).to.be.revertedWith("Only owner");
});

    it("ABAC: owner cannot set attributes for zero address", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner] = await ethers.getSigners();

    await expect(
        membershipLock.connect(owner).setUserAttributes(ethers.ZeroAddress, 2, 30, false)
    ).to.be.revertedWith("Invalid user");
});

    it("ABAC: owner cannot set risk score above 100", async function () {
    const membershipLock = await ethers.deployContract("MembershipLock");
    const [owner, user] = await ethers.getSigners();

    await expect(
        membershipLock.connect(owner).setUserAttributes(user.address, 2, 101, false)
    ).to.be.revertedWith("Invalid risk score");
});

    //owner 可以给用户授予会员, membershipExpiresAt[user] = block.timestamp + duration;
    it("owner can grant membership", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user] = await ethers.getSigners();

        // 会员有效期:60 * 60s = 1h
        const duration = 60 *60;

        // owner 调用 grantMembership,给 user 授予 1 小时会员
        await membershipLock.connect(owner).grantMembership(user.address, duration);
        const expiresAt = await membershipLock.membershipExpiresAt(user.address);
        expect(expiresAt).to.be.greaterThan(0);
        
    });

    //owner 调用 grantMembership 给用户授权会员时, 合约会 emit MembershipGranted 事件
    it("should emit MembershipGranted when owner grants membership", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user] = await ethers.getSigners();

        const duration = 60*60;

        await expect(
            membershipLock.connect(owner).grantMembership(user.address, duration)
        ).to.emit(membershipLock, "MembershipGranted")
        .withArgs(user.address, duration, anyValue);
        // 断言事件参数依次是: 被授权用户地址、授权时长、任意到期时间
    })

    //owner 授予会员后, 用户应变成有效会员
    it("should return  true after owner grants membership", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user] = await ethers.getSigners();

        const duration = 60*60;
        await membershipLock.connect(owner).grantMembership(user.address, duration);
        expect(await membershipLock.hasValidMembership(user.address)).to.equal(true);

    });

    //grantMembership 授权出来的会员，过期后会失效
    it("should return false after granted membership expires", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user] = await ethers.getSigners();
        const duration = 60;

        //owner 给 user.address 开通 60 秒会员
        await membershipLock.connect(owner).grantMembership(user.address, duration);
        expect(await membershipLock.hasValidMembership(user.address)).to.equal(true);
        
        //把本地测试链的区块时间向前推进指定秒数, 并挖出一个新区块; 让测试链时间前进 61 秒
        await networkHelpers.time.increase(duration +1);
        expect(await membershipLock.hasValidMembership(user.address)).to.equal(false);
    });

    //non-owner 不能授予会员
    it("non-owner cannot grant membership", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        const duration = 60 *60;
        await expect(
            membershipLock.connect(user).grantMembership(user.address, duration)
        ).to.be.revertedWith("Only owner can grant");
        
    });

    //owner不能授权给0地址会员
    it("owner cannot grant membership to zero address", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner] = await ethers.getSigners();


        await expect(
            membershipLock.connect(owner).grantMembership(ethers.ZeroAddress, 30 * 24 * 60 * 60)
        ).to.be.revertedWith("Invalid user");
    });


    //owner cannot grant 0s = duration 不能是 0
    it("owner cannot grant membership with zero duration", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user] = await ethers.getSigners();

        await expect(
            membershipLock.connect(owner).grantMembership(user.address, 0)
        ).to.be.revertedWith("Invalid duration");
        
    });

    //
    it("user cannot purchase membership without payment", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();
        
        //期待交易失败，并返回 Incorrect payment
        await expect(
            //用 user 身份调用 purchaseMembership, 但不发送任何 ETH
            membershipLock.connect(user).purchaseMembership()
        ).to.be.revertedWith("Incorrect payment"); 
    });

    //用户不能用错误金额购买会员
    it("user cannot purchase membership with underpayment", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        await expect(
            membershipLock.connect(user).purchaseMembership({
                value: ethers.parseEther("0.005"),
            })
        ).to.be.revertedWith("Incorrect payment");

    });

    // 用户多付 ETH 时不能购买会员
    it("user cannot purchase membership with overpayment", async function () { 
    const membershipLock = await ethers.deployContract("MembershipLock"); 
    const [, user] = await ethers.getSigners();

    await expect(
        membershipLock.connect(user).purchaseMembership({
            value: ethers.parseEther("0.02"), 
        })
    ).to.be.revertedWith("Incorrect payment"); // 期待交易失败，并且失败原因是 Incorrect payment
    }); 


    //用户调用 purchaseMembership 后，自己应变成有效会员
    it("should return true after user purchases membership", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        //sol: msg.sender = user.address
        await membershipLock.connect(user).purchaseMembership({
            value: ethers.parseEther("0.01"),
        });
        expect(await membershipLock.hasValidMembership(user.address)).to.equal(true);
    });

    //购买成功后, 合约应该收到钱, 并且用户应该成为有效会员
    it("contract should receive payment after purchase and user should become valid member", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        await membershipLock.connect(user).purchaseMembership({
            value: ethers.parseEther("0.01"),
        });

        //拿到合约地址
        const contractAddress = await membershipLock.getAddress();

        //查询合约地址的 ETH 余额
        const contractBalance = await ethers.provider.getBalance(contractAddress);

        expect(contractBalance).to.equal(ethers.parseEther("0.01"));
        expect(await membershipLock.hasValidMembership(user.address)).to.equal(true);
    });

    //有效会员可以从当前到期时间继续续费
    it("active member can renew from current expiration time", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();

        const price = ethers.parseEther("0.01");

        const membershipDuration = 30n * 24n * 60n * 60n;

        await membershipLock.connect(user).purchaseMembership({
            value: price,
        });

        const firstExpiresAt = await membershipLock.membershipExpiresAt(user.address);

        //让测试链时间前进 10 天, 模拟用户会员还没过期时提前续费
        await networkHelpers.time.increase(10 * 24 * 60 * 60);

        await membershipLock.connect(user).purchaseMembership({
            value: price,
        });
        //secondExpiresAt 是续费后的新到期时间
        const secondExpiresAt = await membershipLock.membershipExpiresAt(user.address);

        //断言: 续费后的到期时间, 应该等于第一次到期时间 + 30 天
        expect(secondExpiresAt).to.equal(firstExpiresAt + membershipDuration);
        
    });


    //用户购买得到的 30 天会员, 购买的会员过期后，应该返回 false
    it("should return false after user purchases membership expires", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");

        const [, user] = await ethers.getSigners();

        await membershipLock.connect(user).purchaseMembership({
            //购买会员时随交易发送 0.01 ETH
            value: ethers.parseEther("0.01"),
        });
        expect(await membershipLock.hasValidMembership(user.address)).to.equal(true);

        //让测试链时间快进 30days + 1s
        await networkHelpers.time.increase(30 * 24 * 60 * 60 + 1);

        expect(await membershipLock.hasValidMembership(user.address)).to.equal(false);
    });

     //过期会员再次购买, 从当前时间重新加 30 天
    it("expired member can purchase from current time", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const[, user] = await ethers.getSigners();

        const price = ethers.parseEther("0.01");
        const membershipDuration = 30n * 24n *60n *60n;

        await membershipLock.connect(user).purchaseMembership({
            value: price,
        });

        //测试链时间加1s 确保会员过期
        await networkHelpers.time.increase(30 * 24 * 60 * 60 + 1);

        const tx = await membershipLock.connect(user).purchaseMembership({
            value: price,
        });

        const receipt = await tx.wait();

        //根据区块号读取区块信息
        const block = await ethers.provider.getBlock(receipt!.blockNumber);

        const secondExpiresAt = await membershipLock.membershipExpiresAt(user.address);

        expect(secondExpiresAt).to.equal(BigInt(block!.timestamp) + membershipDuration);
        
    });
    


    //owner 可以把合约里的全部 ETH 提现到指定地址, recipient 表示接收ETH的人
    it("owner can withdraw all ETH from contract to recipient", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user, recipient] = await ethers.getSigners();

        const price = ethers.parseEther("0.01");

        await membershipLock.connect(user).purchaseMembership({
            value: price,
        });

        //获取当前 MembershipLock 合约部署后的地址, 用来查询这个合约地址的 ETH 余额
        const contractAddress = await membershipLock.getAddress();

        //记录提现前 recipient 钱包里的 ETH 余额, 后面用来比较提现后增加了多少
        const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);

        await membershipLock.connect(owner).withdraw(recipient.address);

        // 查询 withdraw 执行后, MembershipLock 合约地址里还剩多少 ETH
        const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);

        // 查询 withdraw 执行后, recipient 钱包里的 ETH 余额
        const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);

        expect(contractBalanceAfter).to.equal(0n);
        expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(price);
    })

    //
    it("should emit Withdrawn when owner withdraws ETH", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, user, recipient] = await ethers.getSigners();

        const price = ethers.parseEther("0.01");

        await membershipLock.connect(user).purchaseMembership({
            value: price,
        });

        await expect(
            membershipLock.connect(owner).withdraw(recipient.address)
        ).to.emit(membershipLock, "Withdrawn")
        .withArgs(recipient.address, price);

    })

    it("non-owner cannot withdraw ETH from contract", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user, recipient] = await ethers.getSigners();

        await expect(
            // 使用非 owner 的 user 调用 withdraw, 并传入 recipient 作为收款地址
            membershipLock.connect(user).withdraw(recipient.address)
        ).to.be.revertedWith("Only owner");
    })

    //owner 调用 withdraw, 但收款地址是 address(0), 失败
    it("owner cannot withdraw to zero address", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner] = await ethers.getSigners();

        //获取 ethers 提供的零地址常量
        const zeroAddress = ethers.ZeroAddress
        
        await expect(
            membershipLock.connect(owner).withdraw(zeroAddress)
        ).to.be.revertedWith("Invalid recipient");
    })

    //当合约余额为 0 时, owner 不能提现
    it("owner cannot withdraw when contract balance is zero", async function () {
        //部署后此时 address(this).balance = 0
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [owner, , recipient] = await ethers.getSigners();
        
        await expect(
            membershipLock.connect(owner).withdraw(recipient.address)
        ).to.be.revertedWith("No balance to withdraw");
        
    })

    //用户成功调用 purchaseMembership 后, 合约会 emit MembershipPurchased 事件
    it("should emit MembershipPurchased when user purchases membership", async function () {
        const membershipLock = await ethers.deployContract("MembershipLock");
        const [, user] = await ethers.getSigners();
        
        const price = ethers.parseEther("0.01");

        await expect(
            membershipLock.connect(user).purchaseMembership({
                value: price,
            })
        ).to.emit(membershipLock, "MembershipPurchased")
        .withArgs(user.address, price, anyValue);
    });


})

// 成功交易 await transaction;

// 失败交易 await expect(transaction).to.be.revertedWith("reason");
