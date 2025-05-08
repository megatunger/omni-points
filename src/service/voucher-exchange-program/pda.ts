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
 * Get the Escrow PDA for an NFT (for listings)
 * This is used when creating a listing to hold the NFT
 * @param nftMint The NFT mint address
 * @param programId The Voucher Exchange program ID
 * @returns [escrowNftPDA, escrowNftBump]
 */
export async function getEscrowNftPDA(
    nftMint: PublicKey,
    programId: PublicKey
): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from(ESCROW_SEED),
            nftMint.toBuffer(),
        ],
        programId
    );
}

/**
 * Get the Escrow PDA for a bid (for bid payments)
 * This is used when creating a bid to hold the payment tokens
 * @param bidder The bidder's public key
 * @param nftMint The NFT mint address
 * @param programId The Voucher Exchange program ID
 * @returns [escrowBidPDA, escrowBidBump]
 */
export async function getEscrowBidPDA(
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
 * Get the Escrow PDA - determines correct escrow based on parameters
 * @param first The first identifier (either bidder PublicKey or nftMint)
 * @param second Optional second identifier (nftMint if first is bidder)
 * @param programId The Voucher Exchange program ID
 * @returns [escrowPDA, escrowBump]
 */
export async function getEscrowPDA(
    first: PublicKey,
    second?: PublicKey,
    programId?: PublicKey
): Promise<[PublicKey, number]> {
    // If only one parameter is provided, assume it's an NFT mint for listings
    if (!second || !programId) {
        return getEscrowNftPDA(first, second! || programId);
    }

    // If both parameters are provided, use them for bid escrow
    return getEscrowBidPDA(first, second, programId);
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
