use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::constants::*;
use anchor_spl::token_interface::{Mint};

#[derive(Accounts)]
pub struct MarkBidForRefund<'info> {
    #[account(
        constraint = authority.key() == exchange.authority.key() @ VoucherExchangeError::NotExchangeAuthority,
    )]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    pub nft_mint: InterfaceAccount<'info, Mint>,

    // Include bidder's public key for PDA derivation
    /// CHECK: Only used for address derivation
    pub bidder: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
        VOUCHER_BID_SEED,
        bidder.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = bid.bump,
        constraint = bid.nft_mint == nft_mint.key() @ VoucherExchangeError::NotBidder,
        constraint = bid.active == true @ VoucherExchangeError::BidNotActive,
    )]
    pub bid: Account<'info, VoucherBid>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<MarkBidForRefund>,
) -> Result<()> {

    // Log which bid we're marking for refund (using bidder address and NFT mint for identification)
    msg!(
        "Marking bid from bidder {} for NFT {} for refund",
        ctx.accounts.bidder.key(),
        ctx.accounts.nft_mint.key()
    );

    // Check that this bid is not already marked for refund
    require!(!ctx.accounts.bid.requires_refund, VoucherExchangeError::BidNotRequiresRefund);

    // Mark the bid as requiring refund
    let bid = &mut ctx.accounts.bid;
    bid.requires_refund = true;

    msg!(
        "Successfully marked bid from bidder {} for NFT {} for refund",
        ctx.accounts.bidder.key(),
        ctx.accounts.nft_mint.key()
    );

    Ok(())
}
