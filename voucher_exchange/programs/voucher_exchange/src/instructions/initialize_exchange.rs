use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use crate::state::*;
use crate::errors::*;
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

    /// Fee receiving account
    pub fee_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeExchange>,
    fee_basis_points: u16,
) -> Result<()> {
    // Check that fee isn't too high
    require!(
        fee_basis_points <= MAX_FEE_BASIS_POINTS,
        VoucherExchangeError::FeeTooHigh
    );

    let exchange = &mut ctx.accounts.exchange;
    exchange.authority = ctx.accounts.authority.key();
    exchange.fee_basis_points = fee_basis_points;
    exchange.fee_account = ctx.accounts.fee_account.key();
    exchange.total_listings = 0;
    exchange.total_bids = 0;
    exchange.bump = ctx.bumps.exchange;

    Ok(())
}