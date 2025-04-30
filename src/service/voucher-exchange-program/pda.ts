import { PublicKey } from "@solana/web3.js";

/**
 * Seeds used for PDA derivation
 */
export const VOUCHER_EXCHANGE_SEED = "voucher_exchange";
export const VOUCHER_LISTING_SEED = "voucher_listing";
export const VOUCHER_BID_SEED = "voucher_bid";
export const ESCROW_SEED = "escrow";
export const VOUCHER_STATE_SEED = "voucher_state";

/**
 * Get the Voucher Exchange PDA
 * @param programId The Voucher Exchange program ID
 * @returns [exchangePDA, exchangeBump]
 */
export async function getExchangePDA(programId: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
        [Buffer.from(VOUCHER_EXCHANGE_SEED)],
        programId
    );
}

/**
 * Get the Voucher Listing PDA
 * @param owner The owner's public key
 * @param nftMint The NFT mint address
 * @param programId The Voucher Exchange program ID
 * @returns [listingPDA, listingBump]
 */
export async function getListingPDA(
    owner: PublicKey,
    nftMint: PublicKey,
    programId: PublicKey
): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from(VOUCHER_LISTING_SEED),
            owner.toBuffer(),
            nftMint.toBuffer(),
        ],
        programId
    );
}

/**
 * Get the Voucher Bid PDA
 * @param bidder The bidder's public key
 * @param nftMint The NFT mint address
 * @param programId The Voucher Exchange program ID
 * @returns [bidPDA, bidBump]
 */
export async function getBidPDA(
    bidder: PublicKey,
    nftMint: PublicKey,
    programId: PublicKey
): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from(VOUCHER_BID_SEED),
            bidder.toBuffer(),
            nftMint.toBuffer(),
        ],
        programId
    );
}

/**
 * Get the Escrow PDA for a bid
 * @param bidder The bidder's public key
 * @param nftMint The NFT mint address
 * @param programId The Voucher Exchange program ID
 * @returns [escrowPDA, escrowBump]
 */
export async function getEscrowPDA(
    bidder: PublicKey,
    nftMint: PublicKey,
    programId: PublicKey
): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from(ESCROW_SEED),
            bidder.toBuffer(),
            nftMint.toBuffer(),
        ],
        programId
    );
}

/**
 * Get the NFT State PDA
 * @param nftMint The NFT mint address
 * @param programId The Voucher Exchange program ID
 * @returns [nftStatePDA, nftStateBump]
 */
export async function getNftStatePDA(
    nftMint: PublicKey,
    programId: PublicKey
): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from(VOUCHER_STATE_SEED),
            nftMint.toBuffer(),
        ],
        programId
    );
}