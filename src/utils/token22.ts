// src/utils/token-utils.ts
import {
    Connection,
    PublicKey,
    TransactionInstruction,
} from '@solana/web3.js';

import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    createMintToInstruction,
    createTransferInstruction,
    getMint,
    MintLayout,
} from '@solana/spl-token';


/**
 * Interface for mint information
 */
export interface MintInfo {
    /** Address of the mint */
    address: PublicKey;
    /** Authority that can mint new tokens */
    mintAuthority: PublicKey | null;
    /** Supply of tokens */
    supply: bigint;
    /** Number of decimals the token uses */
    decimals: number;
    /** Authority that can freeze token accounts */
    freezeAuthority: PublicKey | null;
    /** Is this mint initialized */
    isInitialized: boolean;
}

/**
 * Get mint information for a Token-2022 token
 * @param connection Connection to use
 * @param mint The mint address to retrieve info for
 * @returns The mint information
 */
export async function getMintInfo(
    connection: Connection,
    mint: PublicKey
): Promise<MintInfo> {
    try {
        // Use the SPL token getMint function with Token-2022 program ID
        const mintInfo = await getMint(
            connection,
            mint,
            'confirmed',
            TOKEN_2022_PROGRAM_ID
        );

        return {
            address: mint,
            mintAuthority: mintInfo.mintAuthority,
            supply: mintInfo.supply,
            decimals: mintInfo.decimals,
            freezeAuthority: mintInfo.freezeAuthority,
            isInitialized: mintInfo.isInitialized
        };
    } catch (error) {
        console.error(`Error getting mint info for ${mint.toString()}:`, error);

        // Attempt to manually parse the account data as a fallback
        try {
            const account = await connection.getAccountInfo(mint);

            if (!account) {
                throw new Error(`Mint account ${mint.toString()} not found`);
            }

            // Verify the account is owned by Token-2022 program
            if (!account.owner.equals(TOKEN_2022_PROGRAM_ID)) {
                throw new Error(`Mint account ${mint.toString()} is not a Token-2022 token`);
            }

            // Manually parse the mint data using MintLayout
            const data = Buffer.from(account.data);
            const mintInfo = MintLayout.decode(data);

            const mintAuthority = mintInfo.mintAuthorityOption === 0
                ? null
                : new PublicKey(mintInfo.mintAuthority);

            const freezeAuthority = mintInfo.freezeAuthorityOption === 0
                ? null
                : new PublicKey(mintInfo.freezeAuthority);

            return {
                address: mint,
                mintAuthority: mintAuthority,
                supply: mintInfo.supply,
                decimals: mintInfo.decimals,
                freezeAuthority: freezeAuthority,
                isInitialized: mintInfo.isInitialized
            };
        } catch (fallbackError) {
            console.error("Fallback error getting mint info:", fallbackError);
        }
    }
}

/**
 * Get the associated token account address for Token-2022
 * @param mint The token mint
 * @param owner The account owner
 * @returns The associated token account address
 */
export async function getTokenAccount(
    mint: PublicKey,
    owner: PublicKey
): Promise<PublicKey> {
    // Calculate the token account address using Token-2022 program
    return await getAssociatedTokenAddress(
        mint,
        owner,
        false, // Set allowOwnerOffCurve to false to be safe
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
}

/**
 * Create instruction to initialize an associated token account for Token-2022
 * @param payer The account paying for the transaction
 * @param tokenAccount The token account to create
 * @param owner The owner of the token account
 * @param mint The token mint
 * @returns The instruction to create an associated token account
 */
export function createTokenAccountInstruction(
    payer: PublicKey,
    tokenAccount: PublicKey,
    owner: PublicKey,
    mint: PublicKey
): TransactionInstruction {
    // Create the instruction for Token-2022
    return createAssociatedTokenAccountInstruction(
        payer,
        tokenAccount,
        owner,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
}

/**
 * Create instruction to transfer Token-2022 tokens
 * @param source The source token account
 * @param destination The destination token account
 * @param authority The authority to sign the transaction
 * @param amount The amount to transfer
 * @returns The instruction to transfer tokens
 */
export function createTokenTransferInstruction(
    source: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    amount: number | bigint
): TransactionInstruction {
    return createTransferInstruction(
        source,
        destination,
        authority,
        amount,
        [],
        TOKEN_2022_PROGRAM_ID
    );
}

/**
 * Create instruction to initialize a Token-2022 mint
 * @param mint The mint account to initialize
 * @param decimals The number of decimals for the mint
 * @param mintAuthority The mint authority
 * @param freezeAuthority The freeze authority (optional)
 * @returns The instruction to initialize a mint
 */
export function createTokenMintInstruction(
    mint: PublicKey,
    decimals: number,
    mintAuthority: PublicKey,
    freezeAuthority: PublicKey | null
): TransactionInstruction {
    return createInitializeMintInstruction(
        mint,
        decimals,
        mintAuthority,
        freezeAuthority,
        TOKEN_2022_PROGRAM_ID
    );
}

/**
 * Create instruction to mint Token-2022 tokens
 * @param mint The mint account
 * @param destination The destination token account
 * @param authority The mint authority
 * @param amount The amount to mint
 * @returns The instruction to mint tokens
 */
export function createTokenMintToInstruction(
    mint: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    amount: number | bigint
): TransactionInstruction {
    return createMintToInstruction(
        mint,
        destination,
        authority,
        amount,
        [],
        TOKEN_2022_PROGRAM_ID
    );
}

/**
 * Get the associated token account address directly for Token-2022
 * @param mint The token mint
 * @param owner The account owner
 * @returns The associated token account address
 */
export function deriveAssociatedTokenAccount(
    mint: PublicKey,
    owner: PublicKey
): PublicKey {
    // Find the PDA for the associated token account
    const [associatedAccount] = PublicKey.findProgramAddressSync(
        [
            owner.toBuffer(),
            TOKEN_2022_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    return associatedAccount;
}

/**
 * Check if a token account exists and create it if needed
 * @param connection Connection to use
 * @param tokenAccount The token account to check
 * @param owner The owner of the token account
 * @param mint The token mint
 * @param payer The account paying for the transaction
 * @returns An instruction to create the token account (or null if it already exists)
 */
export async function checkAndCreateTokenAccount(
    connection: Connection,
    tokenAccount: PublicKey,
    owner: PublicKey,
    mint: PublicKey,
    payer: PublicKey
): Promise<TransactionInstruction | null> {
    try {
        // Check if the token account exists
        const tokenAccountInfo = await connection.getAccountInfo(tokenAccount);

        if (!tokenAccountInfo) {
            console.log(`Token account ${tokenAccount.toString()} doesn't exist, creating it`);

            // Create the instruction for Token-2022
            return createAssociatedTokenAccountInstruction(
                payer,
                tokenAccount,
                owner,
                mint,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
        }

        // Account already exists
        return null;
    } catch (error) {
        console.error("Error checking token account:", error);

        // Create the account in case of error
        return createAssociatedTokenAccountInstruction(
            payer,
            tokenAccount,
            owner,
            mint,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
    }
}

/**
 * Get token balance for a token account
 * @param connection Connection to use
 * @param tokenAccount The token account to check
 * @returns The token balance (as UI amount)
 */
export async function getTokenBalance(
    connection: Connection,
    tokenAccount: PublicKey
): Promise<number> {
    try {
        const balance = await connection.getTokenAccountBalance(tokenAccount);
        return balance.value.uiAmount || 0;
    } catch (error) {
        console.error("Error getting token balance:", error);
        return 0;
    }
}
