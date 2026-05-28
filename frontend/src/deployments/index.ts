//集中管理所有网络的部署信息
import hardhatDeployment from "./31337.json";

export type Deployment = {
    chainId: number;
    network: string;
    membershipLock: `0x${string}`;
    deployedAt: string;
};

//建立deploymens映射表 chainId->deployment
const deployments: Record<number, Deployment> = {

    //用 hardhatDeployment.chainId 的值作为对象 key
    [hardhatDeployment.chainId]: hardhatDeployment as Deployment,
};


//根据 chainId 获取部署信息
export function getDeploymentByChainId(chainId: number): Deployment | null {
    return deployments[chainId] ?? null;
}