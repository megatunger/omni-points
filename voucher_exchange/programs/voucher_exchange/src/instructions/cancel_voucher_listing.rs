use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct CancelVoucherListing<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_LISTING_SEED,
        exchange.key().as_ref(),
        &listing_id.to_le_bytes()
        ],
        bump = listing.bump,
        constraint = listing.owner == owner.key() @ VoucherExchangeError::NotListingOwner
    )]
    pub listing: Account<'info, VoucherListing>,

    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CancelVoucherListing>,
    _listing_id: u64,
) -> Result<()> {
    // Mark listing as inactive
    ctx.accounts.listing.active = false;

    Ok(())
}