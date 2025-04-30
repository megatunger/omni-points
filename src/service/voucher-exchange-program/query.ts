import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getNftStatePDA } from "./pda";
import BN from "bn.js";

/**
 * Interface for VoucherExchange account data
 */
export interface VoucherExchange {
    authority: PublicKey;
    totalListings: BN;
    totalBids: BN;
    bump: number;
}

/**
 * Interface for VoucherListing account data
 */
export interface VoucherListing {
    owner: PublicKey;
    nftMint: PublicKey;
    nftAccount: PublicKey;
    price: BN;
    paymentMint: PublicKey;
    active: boolean;
    bump: number;
}

/**
 * Interface for VoucherBid account data
 */
export interface VoucherBid {
    bidder: PublicKey;
    nftMint: PublicKey;
    price: BN;
    paymentMint: PublicKey;
    escrowAccount: PublicKey;
    active: boolean;
    requiresRefund: boolean;
    bump: number;
    escrowBump: number;
}

/**
 * Interface for VoucherState account data
 */
export interface VoucherState {
    nftMint: PublicKey;
    sold: boolean;
    latestSaleTimestamp: BN;
    bump: number;
}

/**
 * Get the Voucher Exchange account data
 * @param program Anchor program
 * @param exchangePDA The exchange PDA
 * @returns VoucherExchange data
 */
export async function getExchangeData(
    program: Program,
    exchangePDA: PublicKey
): Promise<VoucherExchange> {
    return await program.account.voucherExchange.fetch(exchangePDA);
}

/**
 * Get a Voucher Listing account data
 * @param program Anchor program
 * @param listingPDA The listing PDA
 * @returns VoucherListing data
 */
export async function getListingData(
    program: Program,
    listingPDA: PublicKey
): Promise<VoucherListing> {
    return await program.account.voucherListing.fetch(listingPDA);
}

/**
 * Get all active listings
 * @param program Anchor program
 * @returns Array of VoucherListing data
 */
export async function getAllActiveListings(
    program: Program
): Promise<{ address: PublicKey; data: VoucherListing }[]> {
    const listings = await program.account.voucherListing.all([
        {
            memcmp: {
                offset: 8 + 32 + 32 + 32 + 8 + 32, // Skip discriminator, owner, nftMint, nftAccount, price, paymentMint to get to active field
                bytes: Buffer.from([1]).toString("base64"), // 1 = true
            },
        },
    ]);

    return listings.map((listing: { publicKey: any; account: VoucherListing; }) => ({
        address: listing.publicKey,
        data: listing.account as VoucherListing
    }));
}

/**
 * Get all listings for a specific NFT mint
 * @param program Anchor program
 * @param nftMint The NFT mint address
 * @returns Array of VoucherListing data
 */
export async function getListingsByNftMint(
    program: Program,
    nftMint: PublicKey
): Promise<{ address: PublicKey; data: VoucherListing }[]> {
    const listings = await program.account.voucherListing.all([
        {
            memcmp: {
                offset: 8 + 32, // Skip discriminator and owner
                bytes: nftMint.toBase58(),
            },
        },
    ]);

    return listings.map(listing => ({
        address: listing.publicKey,
        data: listing.account as VoucherListing
    }));
}

/**
 * Get all listings for a specific owner
 * @param program Anchor program
 * @param owner The owner's public key
 * @returns Array of VoucherListing data
 */
export async function getListingsByOwner(
    program: Program,
    owner: PublicKey
): Promise<{ address: PublicKey; data: VoucherListing }[]> {
    const listings = await program.account.voucherListing.all([
        {
            memcmp: {
                offset: 8, // Skip discriminator
                bytes: owner.toBase58(),
            },
        },
    ]);

    return listings.map((listing: { publicKey: any; account: VoucherListing; }) => ({
        address: listing.publicKey,
        data: listing.account as VoucherListing
    }));
}

/**
 * Get a Voucher Bid account data
 * @param program Anchor program
 * @param bidPDA The bid PDA
 * @returns VoucherBid data
 */
export async function getBidData(
    program: Program,
    bidPDA: PublicKey
): Promise<VoucherBid> {
    return await program.account.voucherBid.fetch(bidPDA);
}

/**
 * Get all active bids
 * @param program Anchor program
 * @returns Array of VoucherBid data
 */
export async function getAllActiveBids(
    program: Program
): Promise<{ address: PublicKey; data: VoucherBid }[]> {
    const bids = await program.account.voucherBid.all([
        {
            memcmp: {
                offset: 8 + 32 + 32 + 8 + 32 + 32, // Skip discriminator, bidder, nftMint, price, paymentMint, escrowAccount to get to active field
                bytes: Buffer.from([1]).toString("base64"), // 1 = true
            },
        },
    ]);

    return bids.map((bid: { publicKey: any; account: VoucherBid; }) => ({
        address: bid.publicKey,
        data: bid.account as VoucherBid
    }));
}

/**
 * Get all bids for a specific NFT mint
 * @param program Anchor program
 * @param nftMint The NFT mint address
 * @returns Array of VoucherBid data
 */
export async function getBidsByNftMint(
    program: Program,
    nftMint: PublicKey
): Promise<{ address: PublicKey; data: VoucherBid }[]> {
    const bids = await program.account.voucherBid.all([
        {
            memcmp: {
                offset: 8 + 32, // Skip discriminator and bidder
                bytes: nftMint.toBase58(),
            },
        },
    ]);

    return bids.map((bid: { publicKey: any; account: VoucherBid; }) => ({
        address: bid.publicKey,
        data: bid.account as VoucherBid
    }));
}

/**
 * Get all bids by a specific bidder
 * @param program Anchor program
 * @param bidder The bidder's public key
 * @returns Array of VoucherBid data
 */
export async function getBidsByBidder(
    program: Program,
    bidder: PublicKey
): Promise<{ address: PublicKey; data: VoucherBid }[]> {
    const bids = await program.account.voucherBid.all([
        {
            memcmp: {
                offset: 8, // Skip discriminator
                bytes: bidder.toBase58(),
            },
        },
    ]);

    return bids.map((bid: { publicKey: any; account: VoucherBid; }) => ({
        address: bid.publicKey,
        data: bid.account as VoucherBid
    }));
}

/**
 * Get all bids that require refund
 * @param program Anchor program
 * @returns Array of VoucherBid data
 */
export async function getBidsRequiringRefund(
    program: Program
): Promise<{ address: PublicKey; data: VoucherBid }[]> {
    const bids = await program.account.voucherBid.all([
        {
            memcmp: {
                offset: 8 + 32 + 32 + 8 + 32 + 32 + 1, // Skip to requiresRefund field
                bytes: Buffer.from([1]).toString("base64"), // 1 = true
            },
        },
    ]);

    return bids.map((bid: { publicKey: any; account: VoucherBid; }) => ({
        address: bid.publicKey,
        data: bid.account as VoucherBid
    }));
}

/**
 * Get the NFT State account data
 * @param program Anchor program
 * @param nftStatePDA The NFT state PDA
 * @returns VoucherState data
 */
export async function getNftStateData(
    program: Program,
    nftStatePDA: PublicKey
): Promise<VoucherState> {
    return await program.account.voucherState.fetch(nftStatePDA);
}

/**
 * Get all sold NFTs
 * @param program Anchor program
 * @returns Array of VoucherState data
 */
export async function getAllSoldNfts(
    program: Program
): Promise<{ address: PublicKey; data: VoucherState }[]> {
    const nftStates = await program.account.voucherState.all([
        {
            memcmp: {
                offset: 8 + 32, // Skip discriminator and nftMint
                bytes: Buffer.from([1]).toString("base64"), // 1 = true (sold)
            },
        },
    ]);

    return nftStates.map((state: { publicKey: any; account: VoucherState; }) => ({
        address: state.publicKey,
        data: state.account as VoucherState
    }));
}

/**
 * Check if an NFT has been sold
 * @param program Anchor program
 * @param nftMint The NFT mint address
 * @returns Boolean indicating if the NFT has been sold
 */
export async function isNftSold(
    program: Program,
    nftMint: PublicKey
): Promise<boolean> {
    try {
        const [nftStatePDA] = await getNftStatePDA(nftMint, program.programId);
        const nftState = await program.account.voucherState.fetch(nftStatePDA);
        return nftState.sold;
    } catch (error) {
        // If the account doesn't exist, the NFT hasn't been sold
        return false;
    }
}

/**
 * Get the price history for an NFT by its sale timestamp
 * @param program Anchor program
 * @param nftMint The NFT mint address
 * @returns The latest sale timestamp and price from bids/listings if available
 */
export async function getNftSaleInfo(
    program: Program,
    nftMint: PublicKey
): Promise<{ timestamp: BN | null; price: BN | null }> {
    try {
        const [nftStatePDA] = await getNftStatePDA(nftMint, program.programId);
        const nftState = await program.account.voucherState.fetch(nftStatePDA);

        if (!nftState.sold) {
            return { timestamp: null, price: null };
        }

        // Try to find the associated listing or bid that was used for the sale
        // First check listings
        const listings = await getListingsByNftMint(program, nftMint);
        const completedListing = listings.find(listing => !listing.data.active);

        if (completedListing) {
            return {
                timestamp: nftState.latestSaleTimestamp,
                price: completedListing.data.price
            };
        }

        // If no listing found, check bids
        const bids = await getBidsByNftMint(program, nftMint);
        const acceptedBid = bids.find(bid => !bid.data.active && !bid.data.requiresRefund);

        if (acceptedBid) {
            return {
                timestamp: nftState.latestSaleTimestamp,
                price: acceptedBid.data.price
            };
        }

        // If no specific price info found, return just the timestamp
        return {
            timestamp: nftState.latestSaleTimestamp,
            price: null
        };
    } catch (error) {
        return { timestamp: null, price: null };
    }
}