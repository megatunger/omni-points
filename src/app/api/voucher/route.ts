// src/app/api/voucher/route.ts
import { NextResponse } from 'next/server';
import {
    Connection,
    PublicKey,
    Transaction,
} from '@solana/web3.js';

import {
    TOKEN_2022_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createTransferCheckedInstruction,
    getAssociatedTokenAddress,
} from '@solana/spl-token';

/**
 * API to transfer OPT tokens from user to app treasury
 *
 * @route POST /api/voucher
 * @param {string} publicKey - User's wallet public key
 * @param {number} optAmount - Amount of OPT tokens to exchange
 * @returns {object} Transaction to sign
 */
export async function POST(req: Request) {
    try {
        const { publicKey, optAmount } = await req.json();

        // Validate required parameters
        if (!publicKey || !optAmount) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");
        const userPublicKey = new PublicKey(publicKey);
        const appTreasury = new PublicKey(process.env.APP_TREASURY_ADDRESS);

        // Get OPT token mint
        const optMint = new PublicKey(process.env.OPT_TOKEN_MINT);

        // Get mint info to determine decimals
        const mintInfo = await connection.getParsedAccountInfo(optMint);
        const tokenDecimals = mintInfo.value?.data ? (mintInfo.value.data as any).parsed.info.decimals : 9;

        // Calculate the actual amount with decimals
        const tokenAmount = optAmount * (10 ** tokenDecimals);

        // Get the token accounts for OPT using Token-22
        const userOptAccount = await getAssociatedTokenAddress(
            optMint,
            userPublicKey,
            false,
            TOKEN_2022_PROGRAM_ID
        );
        const treasuryOptAccount = await getAssociatedTokenAddress(
            optMint,
            appTreasury,
            false,
            TOKEN_2022_PROGRAM_ID
        );

        // Prepare list of instructions
        let instructions = [];

        // Check and create token accounts if needed - explicitly using TOKEN_2022_PROGRAM_ID
        // First get the associated token program based on the mint
        const associatedTokenProgramId = TOKEN_2022_PROGRAM_ID;

        // Check if the user's OPT account exists
        let userOptAccountInfo = await connection.getAccountInfo(userOptAccount);
        if (!userOptAccountInfo) {
            console.log("Creating user OPT account");
            const createUserOptAccountIx = createAssociatedTokenAccountInstruction(
                userPublicKey,  // payer
                userOptAccount, // associated token account address
                userPublicKey,  // owner
                optMint,        // mint
                associatedTokenProgramId, // explicitly set token program
                TOKEN_2022_PROGRAM_ID    // explicitly set token program
            );
            instructions.push(createUserOptAccountIx);
        }

        // Check if the treasury's OPT account exists
        let treasuryOptAccountInfo = await connection.getAccountInfo(treasuryOptAccount);
        if (!treasuryOptAccountInfo) {
            console.log("Creating treasury OPT account");
            const createTreasuryOptAccountIx = createAssociatedTokenAccountInstruction(
                userPublicKey,     // payer
                treasuryOptAccount, // associated token account address
                appTreasury,       // owner
                optMint,           // mint
                associatedTokenProgramId, // explicitly set token program
                TOKEN_2022_PROGRAM_ID    // explicitly set token program
            );
            instructions.push(createTreasuryOptAccountIx);
        }

        // Check if the user has enough tokens (if the account exists)
        try {
            // Get user token account info directly using Solana RPC
            const userAccountInfo = await connection.getAccountInfo(userOptAccount);

            if (userAccountInfo) {
                // Parse the account data to get the balance
                // For Token-2022, we need to carefully parse the account data
                const accountInfo = await connection.getTokenAccountBalance(
                    userOptAccount,
                    'confirmed'
                );

                const balance = accountInfo.value.uiAmount;
                console.log(`User OPT balance: ${balance}`);

                if (balance < optAmount) {
                    return NextResponse.json({
                        error: "Insufficient OPT balance",
                        required: optAmount,
                        available: balance
                    }, { status: 400 });
                }
            } else {
                // If the account doesn't exist yet, we'll create it but the balance will be 0
                console.log("User token account doesn't exist yet");
                if (optAmount > 0) {
                    return NextResponse.json({
                        error: "Insufficient OPT balance",
                        required: optAmount,
                        available: 0
                    }, { status: 400 });
                }
            }
        } catch (error) {
            console.error("Error checking token balance:", error);
            return NextResponse.json({
                error: "Failed to check token balance",
                details: error.message
            }, { status: 500 });
        }

        // Create transfer instruction with Token-22
        const transferIx = createTransferCheckedInstruction(
            userOptAccount,         // source
            optMint,                // mint
            treasuryOptAccount,     // destination
            userPublicKey,          // owner
            tokenAmount,            // amount
            tokenDecimals,          // decimals
            [],                     // multisigners
            TOKEN_2022_PROGRAM_ID   // explicitly set token program
        );

        // Create transaction for user to sign
        const transaction = new Transaction();

        // Add any account creation instructions first
        for (const instruction of instructions) {
            transaction.add(instruction);
        }

        // Then add the token transfer instruction
        transaction.add(transferIx);

        // Set block hash and fee payer for transaction
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.feePayer = userPublicKey;

        // Verify the transaction will succeed
        try {
            // Simulate the transaction
            const simulation = await connection.simulateTransaction(transaction);
            if (simulation.value.err) {
                console.error("Transaction simulation failed:", simulation.value);
                return NextResponse.json({
                    error: "Transaction simulation failed",
                    details: simulation.value.err,
                    logs: simulation.value.logs
                }, { status: 400 });
            }
        } catch (error) {
            console.error("Error simulating transaction:", error);
        }

        // Serialize transaction for response
        const serializedTx = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false
        }).toString('base64');

        // Return transaction info
        return NextResponse.json({
            transaction: serializedTx,
            optAmount: optAmount,
            message: "Sign the transaction to transfer your OPT tokens"
        });
    } catch (error) {
        console.error("Error in token transfer API:", error);
        return NextResponse.json({
            error: "Failed to create token transfer transaction",
            details: error.message
        }, { status: 500 });
    }
}
