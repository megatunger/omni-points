use anchor_lang::prelude::*;

#[error_code]
pub enum VoucherExchangeError {
    #[msg("Exchange fee is too high")]
    FeeTooHigh,

    #[msg("Invalid price")]
    InvalidPrice,

    #[msg("Not the NFT owner")]
    NotNFTOwner,

    #[msg("Not the listing owner")]
    NotListingOwner,

    #[msg("Not the bidder")]
    NotBidder,

    #[msg("Not the exchange authority")]
    NotExchangeAuthority,

    #[msg("Insufficient funds for transaction")]
    InsufficientFunds,

    #[msg("Listing is not active")]
    ListingNotActive,

    #[msg("Bid is not active")]
    BidNotActive,

    #[msg("Insufficient NFT amount (must be 1)")]
    InsufficientNFTAmount,

    #[msg("NFT has already been sold")]
    NFTAlreadySold,

    #[msg("Bid does not require refund")]
    BidNotRequiresRefund,

    #[msg("Invalid bid state for this operation")]
    InvalidBidState,
}