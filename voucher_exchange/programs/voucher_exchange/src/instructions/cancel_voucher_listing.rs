use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct CancelVoucherListing<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_LISTING_SEED,
        exchange.key().as_ref(),
        owner.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = listing.bump,
        constraint = listing.owner == owner.key() @ VoucherExchangeError::NotListingOwner
    )]
    pub listing: Account<'info, VoucherListing>,

    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub owner: Signer<'info>,

    // Added nft_mint account for PDA derivation
    /// CHECK: Only used for address derivation
    pub nft_mint: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CancelVoucherListing>,
) -> Result<()> {
    // Mark listing as inactive
    ctx.accounts.listing.active = false;

    Ok(())
}