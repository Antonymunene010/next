declare module '@jito-labs/sdk' {
  import { Transaction, Keypair } from '@solana/web3.js';

  export class Bundle {
    constructor(transactions: Transaction[]);
  }

  export interface BundleResult {
    bundleId: string;
    status: string;
  }

  export class JitoRpcClient {
    constructor(endpoint: string);
  }

  export class SearcherClient {
    constructor(authToken: string, endpoint: string);
    sendBundle(bundle: Bundle, tipAccount: TipAccount): Promise<BundleResult>;
  }

  export class TipAccount {
    static create(keypair: Keypair): Promise<TipAccount>;
  }
} 