//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

//保存和判断会员资格
contract MiniMembership{
    mapping(address => bool) public members;

    function setMember(address user, bool isMember)public{
        members[user] = isMember;
    }

    //查询某个地址是不是会员
    function hasValidMembership(address user) public view returns (bool){
        return members[user];
    }

}