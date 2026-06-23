//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract MembershipLock{
    address public owner;

    uint256 public price = 0.01 ether;

    //address 对应会员到期时间戳
    mapping(address => uint256) public membershipExpiresAt;

    //某个地址是否被允许访问
    mapping(address => bool) public aclAllowlist;

    //为操作员角色创建一个固定的角色编号
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(bytes32 => mapping( address => bool)) public roles;


    //定义事件
    event MembershipPurchased(address indexed user, uint256 amount, uint256 expiresAt);

    event MembershipGranted(address indexed user, uint256 duration, uint256 expiresAt);

    event Withdrawn(address indexed recipient, uint256 amount);

// constructor 会在合约部署时自动执行一次,部署合约的人为msg.sender,部署者设置为管理员 owner
    constructor(){
        owner = msg.sender;
    }

//modifier在函数真正执行之前, 先执行一段检查逻辑
    modifier onlyOwner(){
        require(msg.sender == owner, "Only owner");

        _;
    }

    //管理员把用户加入 ACL 白名单
    function addToAcl(address user) external onlyOwner {
    require(user != address(0), "Invalid user");

    aclAllowlist[user] = true;
    }

    //把用户移出 ACL 白名单
    function removeFromAcl(address user) external onlyOwner {
    require(user != address(0), "Invalid user");

    aclAllowlist[user] = false;
    }

    function canAccessByACL(address user) public view returns (bool){
        return aclAllowlist[user];
    }


    //owner 给某个用户授予某个角色
    function grantRole(bytes32 role, address user) external onlyOwner {
    require(user != address(0), "Invalid user");

    roles[role][user] = true;
}

    //撤销角色
    function revokeRole(bytes32 role, address user) external onlyOwner {
    require(user != address(0), "Invalid user");

    roles[role][user] = false;
}

//用户是否拥有OPERATOR_ROLE
    function hasRole(bytes32 role, address user) public view returns (bool) {
    return roles[role][user];
}

    //用户能不能通过 RBAC 访问
    function canAccessByRBAC(address user) public view returns (bool){
        return hasRole(OPERATOR_ROLE, user);
    }

    //给某个用户授予会员资格
    function grantMembership(address user, uint256 duration) public{

        require(msg.sender == owner, "Only owner can grant");

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

        //续费规则: 从 当前到期时间 和 当前区块时间 里选择更晚的那个时间继续加 30 天
        uint256 expiresAt = (
            currentExpiresAt > block.timestamp
                ? currentExpiresAt
                : block.timestamp
        ) + 30 days;

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
