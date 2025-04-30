import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {
    getExchangePDA,
    getListingPDA,
    getBidPDA,
    getEscrowPDA,
    getNftStatePDA
} from "./pda";
import BN from "bn.js";

const idl = require("./voucher_exchange.json");

/**
 * Initialize the program and get an Anchor program instance
 * @param connection Solana connection
 * @param programId The Voucher Exchange program ID
 * @param wallet The wallet to use for the program
 * @returns Program instance
 */
export function initializeProgram(
    connection: Connection,
    programId: string,
    wallet: anchor.Wallet
): Program {
    const provider = new anchor.AnchorProvider(
        connection,
        wallet,
        { commitment: "confirmed" }
    );

    return new anchor.Program(idl, new PublicKey(programId), provider);
}

/**
 * Initialize a new voucher exchange
 * @param program Anchor program
 * @param authority Authority of the exchange
 * @param feeAccount Fee account to receive fees
 * @returns Transaction signature
 */
export async function initializeExchange(
    program: Program,
    authority: Keypair,
    feeAccount: PublicKey
): Promise<string> {
    const [exchangePDA] = await getExchangePDA(program.programId);

    const tx = await program.methods
        .initializeExchange()
        .accounts({
            exchange: exchangePDA,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();

    return tx;
}

/**
 * Create a voucher listing
 * @param program Anchor program
 * @param owner Owner of the NFT
 * @param nftMint NFT mint address
 * @param nftAccount Token account holding the NFT
 * @param paymentMint Token mint used for payment
 * @param price Listing price
 * @returns Transaction signature
 */
export async function createVoucherListing(
    program: Program,
    owner: Keypair,
    nftMint: PublicKey,
    nftAccount: PublicKey,
    paymentMint: PublicKey,
    price: BN
): Promise<string> {
    const [exchangePDA] = await getExchangePDA(program.programId);
    const [listingPDA] = await getListingPDA(owner.publicKey, nftMint, program.programId);

    const tx = await program.methods
        .createVoucherListing(price)
        .accounts({
            listing: listingPDA,
            exchange: exchangePDA,
            owner: owner.publicKey,
            nftMint: nftMint,
            nftAccount: nftAccount,
            paymentMint: paymentMint,
            tokenProgram: TOKEN_PROGRAM_ID, // Or TOKEN_2022_PROGRAM_ID if applicable
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([owner])
        .rpc();

    return tx;
}

/**
 * Create a voucher bid
 * @param program Anchor program
 * @param bidder Bidder
 * @param nftMint NFT mint address
 * @param paymentMint Token mint used for payment
 * @param bidderTokenAccount Bidder's token account
 * @param price Bid price
 * @returns Transaction signature
 */
export async function createVoucherBid(
    program: Program,
    bidder: Keypair,
    nftMint: PublicKey,
    paymentMint: PublicKey,
    bidderTokenAccount: PublicKey,
    price: BN
): Promise<string> {
    const [exchangePDA] = await getExchangePDA(program.programId);
    const [bidPDA] = await getBidPDA(bidder.publicKey, nftMint, program.programId);
    const [escrowPDA, escrowBump] = await getEscrowPDA(bidder.publicKey, nftMint, program.programId);

    // Check if NFT state exists
    let nftState: PublicKey | null = null;
    try {
        const [nftStatePDA] = await getNftStatePDA(nftMint, program.programId);
        await program.account.voucherState.fetch(nftStatePDA);
        nftState = nftStatePDA;
    } catch (error) {
        // NFT state doesn't exist yet, that's OK
        nftState = null;
    }

    const tx = await program.methods
        .createVoucherBid(price, escrowBump)
        .accounts({
            bid: bidPDA,
            exchange: exchangePDA,
            bidder: bidder.publicKey,
            nftMint: nftMint,
            nftState: nftState, // Can be null
            paymentMint: paymentMint,
            bidderTokenAccount: bidderTokenAccount,
            escrowAccount: escrowPDA,
            tokenProgram: TOKEN_PROGRAM_ID, // Or TOKEN_2022_PROGRAM_ID if applicable
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([bidder])
        .rpc();

    return tx;
}

/**
 * Accept a voucher bid
 * @param program Anchor program
 * @param owner Owner of the NFT
 * @param bidder Bidder's public key
 * @param nftMint NFT mint address
 * @param ownerNftAccount Owner's NFT token account
 * @param bidderNftAccount Bidder's NFT token account
 * @param paymentMint Token mint used for payment
 * @param ownerPaymentAccount Owner's payment token account
 * @returns Transaction signature
 */
export async function acceptVoucherBid(
    program: Program,
    owner: Keypair,
    bidder: PublicKey,
    nftMint: PublicKey,
    ownerNftAccount: PublicKey,
    bidderNftAccount: PublicKey,
    paymentMint: PublicKey,
    ownerPaymentAccount: PublicKey
): Promise<string> {
    const [bidPDA] = await getBidPDA(bidder, nftMint, program.programId);
    const [escrowPDA] = await getEscrowPDA(bidder, nftMint, program.programId);
    const [nftStatePDA] = await getNftStatePDA(nftMint, program.programId);

    const tx = await program.methods
        .acceptVoucherBid()
        .accounts({
            bid: bidPDA,
            owner: owner.publicKey,
            bidder: bidder,
            nftMint: nftMint,
            nftState: nftStatePDA,
            ownerNftAccount: ownerNftAccount,
            bidderNftAccount: bidderNftAccount,
            paymentMint: paymentMint,
            escrowAccount: escrowPDA,
            ownerPaymentAccount: ownerPaymentAccount,
            tokenProgram: TOKEN_PROGRAM_ID, // Or TOKEN_2022_PROGRAM_ID if applicable
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            clock: SYSVAR_CLOCK_PUBKEY,
        })
        .signers([owner])
        .rpc();

    return tx;
}

/**
 * Fulfill a voucher listing (direct purchase)
 * @param program Anchor program
 * @param buyer Buyer
 * @param owner Owner's public key
 * @param nftMint NFT mint address
 * @param nftAccount Owner's NFT token account
 * @param buyerNftAccount Buyer's NFT token account
 * @param paymentMint Token mint used for payment
 * @param buyerPaymentAccount Buyer's payment token account
 * @param ownerPaymentAccount Owner's payment token account
 * @returns Transaction signature
 */
export async function fulfillVoucherListing(
    program: Program,
    buyer: Keypair,
    owner: PublicKey,
    nftMint: PublicKey,
    nftAccount: PublicKey,
    buyerNftAccount: PublicKey,
    paymentMint: PublicKey,
    buyerPaymentAccount: PublicKey,
    ownerPaymentAccount: PublicKey
): Promise<string> {
    const [exchangePDA] = await getExchangePDA(program.programId);
    const [listingPDA] = await getListingPDA(owner, nftMint, program.programId);
    const [nftStatePDA] = await getNftStatePDA(nftMint, program.programId);

    const tx = await program.methods
        .fulfillVoucherListing()
        .accounts({
            listing: listingPDA,
            exchange: exchangePDA,
            buyer: buyer.publicKey,
            owner: owner,
            nftMint: nftMint,
            nftState: nftStatePDA,
            nftAccount: nftAccount,
            buyerNftAccount: buyerNftAccount,
            paymentMint: paymentMint,
            buyerPaymentAccount: buyerPaymentAccount,
            ownerPaymentAccount: ownerPaymentAccount,
            tokenProgram: TOKEN_PROGRAM_ID, // Or TOKEN_2022_PROGRAM_ID if applicable
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            clock: SYSVAR_CLOCK_PUBKEY,
        })
        .signers([buyer])
        .rpc();

    return tx;
}

/**
 * Cancel a voucher listing
 * @param program Anchor program
 * @param owner Owner of the listing
 * @param nftMint NFT mint address
 * @returns Transaction signature
 */
export async function cancelVoucherListing(
    program: Program,
    owner: Keypair,
    nftMint: PublicKey
): Promise<string> {
    const [listingPDA] = await getListingPDA(owner.publicKey, nftMint, program.programId);

    const tx = await program.methods
        .cancelVoucherListing()
        .accounts({
            listing: listingPDA,
            owner: owner.publicKey,
            nftMint: nftMint,
            systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

    return tx;
}

/**
 * Cancel a voucher bid
 * @param program Anchor program
 * @param bidder Bidder
 * @param nftMint NFT mint address
 * @param bidderTokenAccount Bidder's token account
 * @returns Transaction signature
 */
export async function cancelVoucherBid(
    program: Program,
    bidder: Keypair,
    nftMint: PublicKey,
    paymentMint: PublicKey,
    bidderTokenAccount: PublicKey
): Promise<string> {
    const [bidPDA] = await getBidPDA(bidder.publicKey, nftMint, program.programId);
    const [escrowPDA] = await getEscrowPDA(bidder.publicKey, nftMint, program.programId);

    const tx = await program.methods
        .cancelVoucherBid()
        .accounts({
            bid: bidPDA,
            bidder: bidder.publicKey,
            nftMint: nftMint,
            escrowAccount: escrowPDA,
            paymentMint: paymentMint,
            bidderTokenAccount: bidderTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID, // Or TOKEN_2022_PROGRAM_ID if applicable
            systemProgram: SystemProgram.programId,
        })
        .signers([bidder])
        .rpc();

    return tx;
}

/**
 * Mark a bid for refund
 * @param program Anchor program
 * @param authority Authority of the exchange
 * @param nftMint NFT mint address
 * @param bidder Bidder's public key
 * @returns Transaction signature
 */
export async function markBidForRefund(
    program: Program,
    authority: Keypair,
    nftMint: PublicKey,
    bidder: PublicKey
): Promise<string> {
    const [exchangePDA] = await getExchangePDA(program.programId);
    const [nftStatePDA] = await getNftStatePDA(nftMint, program.programId);
    const [bidPDA] = await getBidPDA(bidder, nftMint, program.programId);

    const tx = await program.methods
        .markBidForRefund()
        .accounts({
            authority: authority.publicKey,
            exchange: exchangePDA,
            nftState: nftStatePDA,
            nftMint: nftMint,
            bidder: bidder,
            bid: bidPDA,
            systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

    return tx;
}

/**
 * Refund a bid
 * @param program Anchor program
 * @param bidder Bidder
 * @param nftMint NFT mint address
 * @param bidderTokenAccount Bidder's token account
 * @returns Transaction signature
 */
export async function refundBid(
    program: Program,
    bidder: Keypair,
    nftMint: PublicKey,
    paymentMint: PublicKey,
    bidderTokenAccount: PublicKey
): Promise<string> {
    const [bidPDA] = await getBidPDA(bidder.publicKey, nftMint, program.programId);
    const [escrowPDA] = await getEscrowPDA(bidder.publicKey, nftMint, program.programId);

    const tx = await program.methods
        .refundBid()
        .accounts({
            bid: bidPDA,
            bidder: bidder.publicKey,
            nftMint: nftMint,
            escrowAccount: escrowPDA,
            paymentMint: paymentMint,
            bidderTokenAccount: bidderTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID, // Or TOKEN_2022_PROGRAM_ID if applicable
            systemProgram: SystemProgram.programId,
        })
        .signers([bidder])
        .rpc();

    return tx;
}