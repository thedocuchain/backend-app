import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import Web3 from 'web3';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { BlockchainTypes } from '../common/enums/entities.enum';
import { BlockchainConfigService } from '../blockchain/config/blockchain.config';

type ChainKind = 'evm' | 'solana';

interface MonitoredChain {
  blockchain: BlockchainTypes;
  label: string;
  symbol: string;
  kind: ChainKind;
  threshold: number; // native units, ~ $1 of gas
  explorer: string; // address page prefix
}

@Injectable()
export class WalletMonitorService implements OnModuleInit {
  private readonly logger = new Logger(WalletMonitorService.name);
  // Dedicated bot/chat for wallet alerts — separate from the feedbacks TG_* creds.
  private readonly tgToken: string;
  private readonly tgChatId: string;
  private readonly remindMs: number;
  private readonly chains: MonitoredChain[];
  private readonly addresses = new Map<BlockchainTypes, string>();
  private readonly alerted = new Map<BlockchainTypes, number>(); // last alert (ms) while low

  constructor(
    private readonly config: ConfigService,
    private readonly blockchainConfig: BlockchainConfigService,
  ) {
    this.tgToken = this.config.get<string>('WALLET_ALERT_TG_BOT_TOKEN');
    this.tgChatId = this.config.get<string>('WALLET_ALERT_TG_CHAT_ID');
    this.remindMs =
      Number(this.config.get<string>('WALLET_ALERT_REMIND_HOURS') ?? 12) * 3600_000;

    // Thresholds are native-token amounts ≈ $1 — override via WALLET_ALERT_<CHAIN>_MIN.
    this.chains = [
      { blockchain: BlockchainTypes.POLYGON, label: 'Polygon', symbol: 'POL', kind: 'evm', threshold: this.min('POLYGON', 5), explorer: 'https://polygonscan.com/address/' },
      { blockchain: BlockchainTypes.BSC, label: 'BNB Chain', symbol: 'BNB', kind: 'evm', threshold: this.min('BSC', 0.0015), explorer: 'https://bscscan.com/address/' },
      { blockchain: BlockchainTypes.BASE, label: 'Base', symbol: 'ETH', kind: 'evm', threshold: this.min('BASE', 0.0004), explorer: 'https://basescan.org/address/' },
      { blockchain: BlockchainTypes.SEI, label: 'Sei', symbol: 'SEI', kind: 'evm', threshold: this.min('SEI', 4), explorer: 'https://seitrace.com/address/' },
      { blockchain: BlockchainTypes.SOLANA, label: 'Solana', symbol: 'SOL', kind: 'solana', threshold: this.min('SOLANA', 0.01), explorer: 'https://solscan.io/account/' },
    ];
  }

  async onModuleInit(): Promise<void> {
    for (const chain of this.chains) {
      try {
        this.addresses.set(chain.blockchain, await this.deriveAddress(chain));
        this.logger.log(`Monitoring ${chain.label}: ${this.addresses.get(chain.blockchain)}`);
      } catch (error) {
        this.logger.warn(`Skipping ${chain.label} — ${error.message}`);
      }
    }
    // Baseline check on boot (cron then runs hourly). Non-blocking.
    void this.checkBalances();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkBalances(): Promise<void> {
    const low: string[] = [];
    const recovered: string[] = [];

    for (const chain of this.chains) {
      const address = this.addresses.get(chain.blockchain);
      if (!address) continue;

      let balance: number;
      try {
        balance = await this.getBalance(chain, address);
      } catch (error) {
        this.logger.warn(`${chain.label}: balance check failed — ${error.message}`);
        continue;
      }

      const isLow = balance < chain.threshold;
      this.logger.log(
        `${chain.label}: ${this.fmt(balance)} ${chain.symbol} (min ${chain.threshold}) ${isLow ? 'LOW' : 'ok'}`,
      );

      if (isLow) {
        const last = this.alerted.get(chain.blockchain);
        if (last === undefined || Date.now() - last >= this.remindMs) {
          low.push(
            `⚠️ <b>${chain.label}</b>: ${this.fmt(balance)} ${chain.symbol} ` +
              `(min ${this.fmt(chain.threshold)} ${chain.symbol})\n` +
              `<a href="${chain.explorer}${address}"><code>${address}</code></a>`,
          );
          this.alerted.set(chain.blockchain, Date.now());
        }
      } else if (this.alerted.has(chain.blockchain)) {
        recovered.push(`✅ <b>${chain.label}</b> recovered: ${this.fmt(balance)} ${chain.symbol}`);
        this.alerted.delete(chain.blockchain);
      }
    }

    const parts: string[] = [];
    if (low.length) parts.push('🚨 <b>Low wallet balance — top up gas</b>', ...low);
    if (recovered.length) parts.push(...recovered);
    if (parts.length) await this.notify(parts.join('\n\n'));
  }

  private async getBalance(chain: MonitoredChain, address: string): Promise<number> {
    const cfg = this.blockchainConfig.getConfig(chain.blockchain);
    const rpc = cfg.rpcUrls[0];

    if (chain.kind === 'evm') {
      const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
      const wei = await web3.eth.getBalance(address);
      return Number(wei) / 1e18;
    }

    const connection = new Connection(
      rpc || clusterApiUrl((cfg.cluster as any) || 'mainnet-beta'),
      'confirmed',
    );
    const lamports = await connection.getBalance(new PublicKey(address));
    return lamports / 1e9;
  }

  private async deriveAddress(chain: MonitoredChain): Promise<string> {
    const cfg = this.blockchainConfig.getConfig(chain.blockchain);
    if (chain.kind === 'evm') {
      const key = cfg.privateKey.startsWith('0x') ? cfg.privateKey : `0x${cfg.privateKey}`;
      return new Web3().eth.accounts.privateKeyToAccount(key).address;
    }
    return this.solanaAddress(cfg.privateKey);
  }

  private async solanaAddress(key: string): Promise<string> {
    let bytes: Uint8Array;
    if (key.includes(',')) {
      bytes = Uint8Array.from(key.split(',').map((s) => parseInt(s.trim(), 10)));
    } else {
      const hex = key.replace(/^0x/, '');
      if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
        bytes = Uint8Array.from(Buffer.from(hex, 'hex'));
      } else {
        // bs58 is ESM-only — import dynamically (matches blockchain.service.ts)
        const bs58 = (await import('bs58')).default;
        try {
          bytes = bs58.decode(key);
        } catch {
          bytes = Uint8Array.from(Buffer.from(key, 'base64'));
        }
      }
    }
    const keypair = bytes.length === 64 ? Keypair.fromSecretKey(bytes) : Keypair.fromSeed(bytes);
    return keypair.publicKey.toBase58();
  }

  private async notify(text: string): Promise<void> {
    if (!this.tgToken || !this.tgChatId) {
      this.logger.warn(
        'Wallet alerts not configured — set WALLET_ALERT_TG_BOT_TOKEN and WALLET_ALERT_TG_CHAT_ID',
      );
      return;
    }
    try {
      await axios.post(
        `https://api.telegram.org/bot${this.tgToken}/sendMessage`,
        {
          chat_id: this.tgChatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        },
        { timeout: 15000 },
      );
    } catch (error) {
      this.logger.error(
        `Wallet alert send failed: ${error?.response?.data?.description || error.message}`,
      );
    }
  }

  private fmt(n: number): string {
    return Number(n.toFixed(8)).toString();
  }

  private min(chain: string, def: number): number {
    const v = this.config.get<string>(`WALLET_ALERT_${chain}_MIN`);
    return v !== undefined && v !== '' ? Number(v) : def;
  }
}
