export interface BlockchainConfig {
  rpcUrls: string[];
  privateKey: string;
  chainId?: number;
  transactionValue: string;
  gasLimit?: number;
  gasPriceMultiplier?: number;
  cluster?: string;
  network?: 'mainnet' | 'testnet' | 'regtest';
  feeRate?: number;
}

export interface BlockchainConfigs {
  [key: string]: BlockchainConfig;
}
