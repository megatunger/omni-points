use anchor_lang::prelude::*;

#[account]
pub struct VoucherExchange {
    // Authority that can manage the exchange
    pub authority: Pubkey,
    // Fee percentage in basis points (1/100 of 1%)
    pub fee_basis_points: u16,
    // Account that receives the fee payments
    pub fee_account: Pubkey,
    // Total number of listings created
    pub total_listings: u64,
    // Total number of bids created
    pub total_bids: u64,
    // Bump for PDA derivation
    pub bump: u8,
}

#[account]
pub struct VoucherListing {
    // Owner of the NFT being listed
    pub owner: Pubkey,
    // The NFT mint address
    pub nft_mint: Pubkey,
    // The token account holding the NFT
    pub nft_account: Pubkey,
    // Listing price
    pub price: u64,
    // Token mint used for payment (e.g., USDC)
    pub payment_mint: Pubkey,
    // Whether the listing is active
    pub active: bool,
    // Unique listing ID
    pub listing_id: u64,
    // Reference to parent exchange
    pub exchange: Pubkey,
    // Bump for PDA derivation
    pub bump: u8,
}

#[account]
pub struct VoucherBid {
    // The user who placed the bid
    pub bidder: Pubkey,
    // The NFT mint that is being bid on
    pub nft_mint: Pubkey,
    // Bid amount
    pub price: u64,
    // Token mint used for payment (e.g., USDC)
    pub payment_mint: Pubkey,
    // Escrow account holding the bid funds
    pub escrow_account: Pubkey,
    // Whether the bid is active
    pub active: bool,
    // Whether the bid needs to be refunded
    pub requires_refund: bool,
    // Unique bid ID
    pub bid_id: u64,
    // Reference to parent exchange
    pub exchange: Pubkey,
    // Bump for PDA derivation
    pub bump: u8,
    // Bump for escrow PDA derivation
    pub escrow_bump: u8,
}

#[account]
pub struct VoucherState {
    // The NFT mint address
    pub nft_mint: Pubkey,
    // Whether the NFT has been sold
    pub sold: bool,
    // Timestamp of the latest sale
    pub latest_sale_timestamp: i64,
    // Reference to parent exchange
    pub exchange: Pubkey,
    // Bump for PDA derivation
    pub bump: u8,
}