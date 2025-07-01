import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Gorbagana Configuration - HTTPS Only
const GORBAGANA_RPC_ENDPOINTS = [
  'https://rpc.gorbagana.wtf/',
  'https://gorchain.wstf.io',
  'https://api.devnet.solana.com', // Fallback
];

const POLL_INTERVAL = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 60 seconds total
const SEND_RETRIES = 5; // Retry sending up to 5 times

interface TransactionConfig {
  endpoint?: string;
  commitment?: 'confirmed' | 'finalized' | 'processed';
  disableRetryOnRateLimit?: boolean;
  httpHeaders?: Record<string, string>;
}

interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  explorerUrl?: string;
  balanceChange?: number;
  fee?: number;
}

class GorbaganaTransactionService {
  private connection: Connection;
  private endpoint: string;

  constructor(config: TransactionConfig = {}) {
    this.endpoint = config.endpoint || GORBAGANA_RPC_ENDPOINTS[0];
    
    // Force HTTPS and disable WebSocket
    this.connection = new Connection(this.endpoint, {
      commitment: config.commitment || 'confirmed',
      disableRetryOnRateLimit: config.disableRetryOnRateLimit || false,
      wsEndpoint: '', // Explicitly disable WebSocket
      httpHeaders: {
        'User-Agent': 'gorbagana-battleship',
        ...config.httpHeaders
      },
    });

    console.log(`🌐 Gorbagana Service initialized with endpoint: ${this.endpoint}`);
  }

  // Helper function to format balance
  private formatBalance(lamports: number): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(6) + ' $GOR';
  }

  // Helper function to get current timestamp
  private getTimestamp(): string {
    return new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' });
  }

  // Helper function to confirm transaction via polling
  private async confirmTransaction(signature: string): Promise<{ status: string; error?: any }> {
    console.log('🔄 Polling for transaction confirmation...');
    
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      try {
        const { value } = await this.connection.getSignatureStatuses([signature], { 
          searchTransactionHistory: true 
        });
        
        const status = value[0];
        if (status) {
          if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
            console.log(`✅ Transaction confirmed after ${i + 1} polls!`);
            return status.err ? { status: 'Failed', error: status.err } : { status: 'Success' };
          }
          console.log(`🔄 Poll ${i + 1}/${MAX_POLL_ATTEMPTS}: Transaction not yet confirmed...`);
        } else {
          console.log(`⏳ Poll ${i + 1}/${MAX_POLL_ATTEMPTS}: Transaction status not found...`);
        }
      } catch (error: any) {
        console.error(`❌ Poll ${i + 1} error:`, error.message);
      }
      
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
    
    throw new Error('Transaction confirmation timed out after 60 seconds.');
  }

  // Test connection to Gorbagana network
  async testConnection(): Promise<boolean> {
    try {
      console.log(`🔍 Testing Gorbagana connection to ${this.endpoint}...`);
      const version = await this.connection.getVersion();
      console.log(`✅ Connected to Gorbagana network version:`, version);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to connect to Gorbagana:`, error.message);
      return false;
    }
  }

  // Get wallet balance
  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      console.log(`💰 Balance for ${publicKey.toBase58().slice(0, 8)}...: ${this.formatBalance(balance)}`);
      return balance;
    } catch (error: any) {
      console.error(`❌ Failed to get balance:`, error.message);
      throw error;
    }
  }

  // Request airdrop (for testing)
  async requestAirdrop(publicKey: PublicKey, amount: number = LAMPORTS_PER_SOL): Promise<string> {
    try {
      console.log(`🪂 Requesting airdrop of ${this.formatBalance(amount)} to ${publicKey.toBase58().slice(0, 8)}...`);
      const signature = await this.connection.requestAirdrop(publicKey, amount);
      
      const confirmResult = await this.confirmTransaction(signature);
      if (confirmResult.status === 'Failed') {
        throw new Error('Airdrop transaction failed: ' + JSON.stringify(confirmResult.error));
      }
      
      console.log(`✅ Airdrop successful! Signature: ${signature}`);
      return signature;
    } catch (error: any) {
      console.error(`❌ Airdrop failed:`, error.message);
      throw error;
    }
  }

  // Send $GOR transaction
  async sendGorTransaction(
    fromKeypair: Keypair,
    toPublicKey: PublicKey,
    amount: number
  ): Promise<TransactionResult> {
    console.log(`\n🚀 Starting Gorbagana transaction at ${this.getTimestamp()}`);
    
    try {
      // 1. Check sender balance
      console.log('\n1️⃣ Checking sender balance...');
      const senderBalanceBefore = await this.getBalance(fromKeypair.publicKey);
      
      if (senderBalanceBefore < amount + 5000) {
        console.warn('⚠️ Insufficient funds. Attempting airdrop...');
        try {
          await this.requestAirdrop(fromKeypair.publicKey);
          const newBalance = await this.getBalance(fromKeypair.publicKey);
          console.log(`✅ Airdrop successful! New balance: ${this.formatBalance(newBalance)}`);
        } catch (airdropError: any) {
          throw new Error('Insufficient funds and airdrop failed. Please fund the wallet manually.');
        }
      }

      // 2. Check recipient balance
      console.log('\n2️⃣ Checking recipient balance...');
      const recipientBalanceBefore = await this.getBalance(toPublicKey);

      // 3. Create and send transaction
      console.log('\n3️⃣ Creating transaction...');
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: amount,
        })
      );
      
      transaction.feePayer = fromKeypair.publicKey;
      transaction.recentBlockhash = blockhash;
      transaction.sign(fromKeypair);

      // 4. Send with retries
      let signature: string = '';
      for (let attempt = 1; attempt <= SEND_RETRIES; attempt++) {
        try {
          console.log(`📤 Sending transaction (Attempt ${attempt}/${SEND_RETRIES})...`);
          signature = await this.connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            maxRetries: 0, // Handle retries manually
          });
          console.log(`✅ Transaction sent! Signature: ${signature}`);
          break;
        } catch (sendError: any) {
          console.error(`❌ Send attempt ${attempt} failed:`, sendError.message);
          if (attempt === SEND_RETRIES) {
            throw new Error('Failed to send transaction after retries.');
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // 5. Confirm transaction
      console.log('\n4️⃣ Confirming transaction...');
      const confirmResult = await this.confirmTransaction(signature);
      
      if (confirmResult.status === 'Failed') {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmResult.error));
      }

      // 6. Get transaction details
      console.log('\n5️⃣ Verifying transaction details...');
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      let fee = 0;
      let balanceChange = 0;
      
      if (tx) {
        fee = tx.meta?.fee || 0;
        balanceChange = amount;
        
        console.log('📋 Transaction Details:');
        console.log('  Status:', tx.meta?.err ? 'Failed' : 'Success');
        console.log('  Amount:', this.formatBalance(amount));
        console.log('  Fee:', this.formatBalance(fee));
        console.log('  Block Time:', new Date((tx.blockTime || 0) * 1000).toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
      }

      // 7. Verify final balances
      console.log('\n6️⃣ Checking final balances...');
      const senderBalanceAfter = await this.getBalance(fromKeypair.publicKey);
      const recipientBalanceAfter = await this.getBalance(toPublicKey);
      
      console.log('📊 Balance Changes:');
      console.log('  Sender:', this.formatBalance(senderBalanceAfter - senderBalanceBefore));
      console.log('  Recipient:', this.formatBalance(recipientBalanceAfter - recipientBalanceBefore));

      const explorerUrl = `https://gorexplorer.net/lookup.html#tx/${signature}`;
      console.log(`🔍 Explorer URL: ${explorerUrl}`);

      return {
        success: true,
        signature,
        explorerUrl,
        balanceChange,
        fee
      };

    } catch (error: any) {
      console.error('\n❌ Transaction failed:', error.message);
      
      // Try to get recent transactions for debugging
      try {
        const signatures = await this.connection.getSignaturesForAddress(fromKeypair.publicKey, { limit: 5 });
        console.log('\n📋 Recent transactions:');
        signatures.forEach((sig, index) => {
          console.log(`  ${index + 1}. ${sig.signature} (${new Date((sig.blockTime || 0) * 1000).toLocaleString()})`);
        });
      } catch (sigError) {
        console.error('Failed to fetch recent transactions:', sigError);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get recent transactions for an address
  async getRecentTransactions(publicKey: PublicKey, limit: number = 10): Promise<any[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
      console.log(`📋 Found ${signatures.length} recent transactions for ${publicKey.toBase58().slice(0, 8)}...`);
      return signatures;
    } catch (error: any) {
      console.error(`❌ Failed to get recent transactions:`, error.message);
      throw error;
    }
  }

  // Switch to different RPC endpoint
  switchEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
    this.connection = new Connection(this.endpoint, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
      wsEndpoint: '', // Explicitly disable WebSocket
      httpHeaders: { 'User-Agent': 'gorbagana-battleship' },
    });
    console.log(`🔄 Switched to endpoint: ${endpoint}`);
  }

  // Get connection info
  getConnectionInfo(): { endpoint: string; commitment: string } {
    return {
      endpoint: this.endpoint,
      commitment: 'confirmed'
    };
  }
}

// Export singleton instance
export const gorbaganaService = new GorbaganaTransactionService({
  endpoint: GORBAGANA_RPC_ENDPOINTS[0], // Default to primary Gorbagana RPC
  commitment: 'confirmed',
  httpHeaders: {
    'User-Agent': 'gorbagana-battleship-v2'
  }
});

export default GorbaganaTransactionService; 