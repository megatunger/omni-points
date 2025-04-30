use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenInterface};
use crate::state::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct InitializeExchange<'info> {
    #[account(
        init,
        payer = authority,
        space = VoucherExchange::SIZE,
        seeds = [EXCHANGE_SEED],
        bump
    )]
    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeExchange>
) -> Result<()> {
    let exchange = &mut ctx.accounts.exchange;
    exchange.authority = ctx.accounts.authority.key();
    exchange.total_listings = 0;
    exchange.total_bids = 0;
    exchange.bump = ctx.bumps.exchange;

    Ok(())
}