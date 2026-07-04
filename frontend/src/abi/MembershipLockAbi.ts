import type { Abi } from "viem";
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
    type: "function",
    name: "getAccessDecision",
    stateMutability: "view",
    inputs: [
        {
            name: "user",
            type: "address",
        },
    ],
    outputs: [
        {
            name: "aclAllowed",
            type: "bool",
        },
        {
            name: "rbacAllowed",
            type: "bool",
        },
        {
            name: "abacAllowed",
            type: "bool",
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
    },

    {
        type: "function",
        name: "addToAcl",
        stateMutability: "nonpayable",
        inputs: [{ name: "user", type: "address" }],
        outputs: [],
    },

    {
        type: "function",
        name: "removeFromAcl",
        stateMutability: "nonpayable",
        inputs: [{ name: "user", type: "address" }],
        outputs: [],
    },

    {
        type: "function",
        name: "OPERATOR_ROLE",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "bytes32" }],
    },

    {
        type: "function",
        name: "grantRole",
        stateMutability: "nonpayable",
        inputs: [
            { name: "role", type: "bytes32" },
            { name: "user", type: "address" },
        ],
        outputs: [],
    },

    {
        type: "function",
        name: "revokeRole",
        stateMutability: "nonpayable",
        inputs: [
            { name: "role", type: "bytes32" },
            { name: "user", type: "address" },
        ],
        outputs: [],
    },

    //Attribute-Based Access Control: setUserAttributes 的 ABI
    {
        type: "function",
        name: "setUserAttributes",
        stateMutability: "nonpayable",
        inputs: [
            { name: "user", type: "address" },
            { name: "kycLevel", type: "uint8" },
            { name: "riskScore", type: "uint8" },
            { name: "banned", type: "bool" },
        ],
        outputs: [],
    },

    {
        type: "function",
        name: "grantMembership",
        stateMutability: "nonpayable",
        inputs: [
            { name: "user", type: "address" },
            { name: "duration", type: "uint256" },
        ],
        outputs: [],
    },
    
    //userAttributes 的 ABI
    {
        type: "function",
        name: "userAttributes",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [
            { name: "kycLevel", type: "uint8" },
            { name: "riskScore", type: "uint8" },
            { name: "banned", type: "bool" },
        ],
    },

    {
        type: "function",
        name: "hasRole",
        stateMutability: "view",
        inputs: [
            { name: "role", type: "bytes32" },
            { name: "user", type: "address" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },


    //nonpayable = 会改状态，但调用时不收 ETH
    {
        type: "function",
        name: "withdraw",
        stateMutability: "nonpayable",
        inputs: [
            {
                name:"recipient",
                type: "address",
            },
        ],
        outputs: [],

    }


] as const satisfies Abi;
