// initialize-exchange.ts
import {Keypair, Connection, SYSVAR_RENT_PUBKEY, SystemProgram} from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { getVoucherExchangeProgram, VOUCHER_EXCHANGE_PROGRAM_ID } from "@project/voucher-exchange";
import { getExchangePDA } from '../service/voucher-exchange-program/pda';
import {TOKEN_PROGRAM_ID} from "@solana/spl-token"
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    try {
        // 1. Load private key from JSON file
        const keyfilePath = "./secrets/wallet.json";
        console.log(`Loading keypair from: ${keyfilePath}`);

        const keypairData = JSON.parse(fs.readFileSync(path.resolve(keyfilePath), 'utf-8'));
        const secretKey = Uint8Array.from(keypairData);
        const keypair = Keypair.fromSecretKey(secretKey);

        console.log(`Using wallet address: ${keypair.publicKey.toString()}`);

        // 2. Connect to Solana cluster
        const endpoint = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
        console.log(`Connecting to Solana cluster: ${endpoint}`);

        const connection = new Connection(endpoint, 'confirmed');

        // 3. Create Anchor wallet and provider
        const wallet = new Wallet(keypair);
        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
        });

        // 4. Get the Voucher Exchange program
        const program = getVoucherExchangeProgram(provider);

        // 5. Get the exchange PDA
        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        console.log(`Exchange PDA: ${exchangePDA.toString()}`);

        // 6. Initialize the exchange
        const tx = await program.methods
            .initializeExchange()
            .accounts({
                authority: keypair.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID
            })
            .signers([keypair])
            .rpc();

        console.log(`Transaction successful! Signature: ${tx}`);
        console.log(`View transaction: https://explorer.solana.com/tx/${tx}?cluster=${process.env.NETWORK || 'devnet'}`);

        // 7. Verify exchange initialization
        try {
            const exchangeAccount = await program.account.voucherExchange.fetch(exchangePDA);
            console.log('Exchange initialized successfully!');
            console.log('Exchange data:', {
                authority: exchangeAccount.authority.toString(),
                totalListings: exchangeAccount.totalListings.toString(),
                totalBids: exchangeAccount.totalBids.toString(),
                bump: exchangeAccount.bump,
            });
        } catch (error) {
            console.error('Failed to fetch exchange account:', error);
        }

    } catch (error) {
        console.error('Error initializing exchange:', error);
    }
}

main();
