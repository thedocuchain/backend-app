export interface BlockchainConfig {
  rpcUrls: string[];
  privateKey: string;
  chainId?: number;
  transactionValue: string;
  gasLimit?: number;
  gasPriceMultiplier?: number;
  cluster?: string;
}

export interface BlockchainConfigs {
  [key: string]: BlockchainConfig;
}
