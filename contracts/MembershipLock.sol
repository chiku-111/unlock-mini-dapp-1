//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract MembershipLock{
    //管理员地址保存
    address public owner;

    // 会员价格，用户购买会员时必须支付 0.01 ETH
    uint256 public price = 0.01 ether;

    //address 对应会员到期时间戳
    mapping(address => uint256) public membershipExpiresAt;

    //定义会员购买事件，用来记录购买者、支付金额和会员到期时间
    event MembershipPurchased(address indexed user, uint256 amount, uint256 expiresAt);

    event MembershipGranted(address indexed user, uint256 duration, uint256 expiresAt);

    event Withdrawn(address indexed recipient, uint256 amount);

// constructor 会在合约部署时自动执行一次,部署合约的人为msg.sender,部署者设置为管理员 owner
    constructor(){
        owner = msg.sender;
    }

//modifier在函数真正执行之前, 先执行一段检查逻辑
    modifier onlyOwner(){
        require(msg.sender == owner, "Only owner can withdraw");

        //如果上面的 require 检查通过, 就继续执行被 onlyOwner 修饰的函数主体
        _;
    }

    //给某个用户授予会员资格
    function grantMembership(address user, uint256 duration) public{

        require(msg.sender == owner, "Only owner can grant");

        //在更新会员信息前, 先验证授权对象和授权时长
        require(user != address(0), "Invalid user");
        require(duration > 0, "Invalid duration");

        // user会员到期时间设置为: 当前区块时间 + 会员有效时长（秒）
        uint256 expiresAt = block.timestamp + duration;
        membershipExpiresAt[user]= expiresAt;

        emit MembershipGranted(user, duration, expiresAt);
    }

    
    // 用户自己调用这个函数, 为自己开通会员, 函数允许接收ETH(payable)
    function purchaseMembership() public payable{
        
        //检查用户这次付款金额是不是刚好等于会员价格
        require(msg.value == price, "Incorrect payment");
        
        uint256 currentExpiresAt = membershipExpiresAt[msg.sender];

        //如果会员还有效,startTime = 当前到期时间,or startTime = 当前区块时间
        uint256 startTime = currentExpiresAt > block.timestamp
            ? currentExpiresAt
            : block.timestamp;

        uint256 expiresAt = startTime + 30 days;

        membershipExpiresAt[msg.sender] = expiresAt;

        emit MembershipPurchased(msg.sender, msg.value, expiresAt);

    }

    // 查询 user 当前是否拥有有效会员
    function hasValidMembership(address user) public view returns (bool) {
        return membershipExpiresAt[user] > block.timestamp;
    }

    //提现函数 withdraw, 接收一个可以接收 ETH 的地址 recipient, 并只有 owner 可以调用
    function withdraw(address payable recipient) external onlyOwner{
       
        require(recipient != address(0), "Invalid recipient");

        uint256 amount = address(this).balance;

        require(amount > 0, "No balance to withdraw");

        // 使用 call 向 recipient 发送 amount 数量的 ETH, 并把是否成功保存到 success
        (bool success, ) = recipient.call{value: amount}("");

        require(success, "Withdraw failed");

        // 发出提现事件, 记录本次成功提现的收款地址和金额
        emit Withdrawn(recipient, amount);
    }
    
}