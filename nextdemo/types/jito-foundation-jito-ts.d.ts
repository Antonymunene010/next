declare module '@jito-foundation/jito-ts' {
  import { Transaction, Keypair } from '@solana/web3.js';

  export enum BundleType {
    Tip = 'tip'
  }

  export interface BundleOptions {
    transactions: Transaction[];
    type: BundleType;
  }

  export class Bundle {
    constructor(options: BundleOptions);
  }

  export interface BundleResult {
    bundleId: string;
    status: string;
  }

  export interface SearcherClientOptions {
    auth_token: string;
    url: string;
  }

  export class JitoRpcClient {
    constructor(endpoint: string);
  }

  export class SearcherClient {
    constructor(options: SearcherClientOptions);
    sendBundle(bundle: Bundle, tipAccount: TipAccountV1): Promise<BundleResult>;
  }

  export class TipAccountV1 {
    static create(keypair: Keypair): Promise<TipAccountV1>;
  }
} 