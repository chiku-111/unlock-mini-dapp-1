export const MEMBERSHIP_LOCK_ABI = [
    {
        type:"function",
        name:"hasValidMembership",
        stateMutability:"view",  //Only read, not modify
        inputs:[
            {
                name:"user",
                type:"address",
            },
        ],

        outputs:[
            {
                name:"",
                type:"bool",
            },
        ],
    },
    {
        type:"function",
        name:"price",
        stateMutability:"view",
        inputs: [],
        outputs: [
            {
                name: "",
                // Solidity 里的 uint256, 在前端会读成 bigint
                type: "uint256",
            }
        ]

    },

    {
        type: "function",
        name: "purchaseMembership",
        stateMutability: "payable",  //表示这个函数会改状态, 并且可收 ETH
        inputs: [],
        outputs:[],
    },

    {
        inputs: [{ internalType: "address", name: "", type: "address"}],
        name: "membershipExpiresAt",
        outputs: [{ internalType: "uint256", name: "", type: "uint256"}],
        stateMutability: "view",
        type: "function",
        
    },

    {
        type: "function",
        name: "owner",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "address"}],
    }


] as const;
