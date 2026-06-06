import { expect } from "chai";

import { network } from "hardhat";

const { ethers } = await network.create();

//create test -> MiniMembership.sol
//默认情况下应该返回 false
describe("MiniMembership", function(){
    it("Should return false by default", async function() {
        const miniMembership = await ethers.deployContract("MiniMembership");
       
    /*const signers = await ethers.getSigners();
    const owner = signers[0]; 下述为数据解构*/

        const [owner] = await ethers.getSigners();
        expect(await miniMembership.hasValidMembership(owner.address)).to.equal(false);
        });

    //after setMember return hasValidMembership
    it("Should return true after setting a member", async function () {
        const miniMembership = await ethers.deployContract("MiniMembership");
    /*const signers = await ethers.getSigners();
      const user = signers[1];*/
        const[, user] = await ethers.getSigners();
        await miniMembership.setMember(user.address, true);
        expect(await miniMembership.hasValidMembership(user.address)).to.equal(true);

    });

    it("Should return false after removing a member", async function () {
        const miniMembership = await ethers.deployContract("MiniMembership");
        const [, user] = await ethers.getSigners();
        await miniMembership.setMember(user.address, true);
        await miniMembership.setMember(user.address, false);
        expect(await miniMembership.hasValidMembership(user.address)).to.equal(false);
    });
})