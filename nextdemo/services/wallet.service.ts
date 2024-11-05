import { 
  Keypair, 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  clusterApiUrl,
  TransactionInstruction
} from '@solana/web3.js';
import bs58 from 'bs58';

export interface WalletInfo {
  publicKey: string;
  privateKey: string;
  balance?: number;
}

export class WalletService {
  private static connection = new Connection(
    clusterApiUrl('devnet'),
    'confirmed'
  );

  static async getBalance(publicKey: string): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(publicKey));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  static async requestAirdrop(publicKey: string, amount: number = 1): Promise<boolean> {
    try {
      const signature = await this.connection.requestAirdrop(
        new PublicKey(publicKey),
        amount * LAMPORTS_PER_SOL
      );
      await this.connection.confirmTransaction(signature);
      return true;
    } catch (error) {
      console.error('Error requesting airdrop:', error);
      return false;
    }
  }

  static async generateWalletsWithBalance(count: number): Promise<WalletInfo[]> {
    try {
      const wallets: WalletInfo[] = [];
      
      for (let i = 0; i < count; i++) {
        const keypair = Keypair.generate();
        const publicKey = keypair.publicKey.toString();
        const balance = await this.getBalance(publicKey);
        
        wallets.push({
          publicKey,
          privateKey: bs58.encode(keypair.secretKey),
          balance
        });
      }
      
      return wallets;
    } catch (error) {
      console.error('Error generating wallets:', error);
      throw error;
    }
  }

  static async fundWallets(
    wallets: WalletInfo[],
    solAmount: number,
    funderPrivateKey: string
  ): Promise<{ success: boolean; failures: string[] }> {
    const failures: string[] = [];
    
    try {
      const fromKeypair = Keypair.fromSecretKey(bs58.decode(funderPrivateKey));
      
      // Process in batches of 5
      const batchSize = 5;
      for (let i = 0; i < wallets.length; i += batchSize) {
        const batch = wallets.slice(i, i + batchSize);

        for (const wallet of batch) {
          try {
            const toAddress = new PublicKey(wallet.publicKey);
            
            const transaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: toAddress,
                lamports: solAmount * LAMPORTS_PER_SOL
              })
            );

            const signature = await sendAndConfirmTransaction(
              this.connection,
              transaction,
              [fromKeypair]
            );

            console.log(`Funded wallet ${wallet.publicKey}, signature: ${signature}`);
          } catch (error) {
            console.error(`Failed to fund wallet ${wallet.publicKey}:`, error);
            failures.push(wallet.publicKey);
          }
        }

        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        success: failures.length === 0,
        failures
      };
    } catch (error) {
      console.error('Error in bulk funding:', error);
      throw error;
    }
  }

  static async exportWallets(wallets: WalletInfo[]): Promise<string> {
    try {
      const walletsWithBalance = await Promise.all(
        wallets.map(async (wallet) => {
          const balance = await this.getBalance(wallet.publicKey);
          return {
            ...wallet,
            balance
          };
        })
      );

      return JSON.stringify(walletsWithBalance, null, 2);
    } catch (error) {
      console.error('Error exporting wallets:', error);
      throw error;
    }
  }

  static async transferAllToFunder(
    wallets: WalletInfo[],
    funderPublicKey: string
  ): Promise<{ success: boolean; totalTransferred: number }> {
    try {
      let totalAmount = 0;
      const walletsWithBalance = await Promise.all(
        wallets.map(async (wallet) => {
          const balance = await this.getBalance(wallet.publicKey);
          return { ...wallet, balance };
        })
      );

      // Filter wallets with sufficient balance
      const validWallets = walletsWithBalance.filter(w => w.balance! > 0.001);
      
      // Process in batches of 5
      const batchSize = 5;
      for (let i = 0; i < validWallets.length; i += batchSize) {
        const batch = validWallets.slice(i, i + batchSize);

        for (const wallet of batch) {
          try {
            const amount = (wallet.balance! - 0.001) * LAMPORTS_PER_SOL;
            const fromKeypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
            
            const transaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: new PublicKey(funderPublicKey),
                lamports: Math.floor(amount)
              })
            );

            await sendAndConfirmTransaction(
              this.connection,
              transaction,
              [fromKeypair]
            );

            totalAmount += amount;
          } catch (error) {
            console.error(`Failed to transfer from wallet ${wallet.publicKey}:`, error);
          }
        }

        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        success: true,
        totalTransferred: totalAmount / LAMPORTS_PER_SOL
      };
    } catch (error) {
      console.error('Error transferring funds:', error);
      return { success: false, totalTransferred: 0 };
    }
  }
} 