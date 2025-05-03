use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface,
    TransferChecked, transfer_checked
};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct CancelVoucherBid<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_BID_SEED,
        // Removed exchange.key().as_ref(),
        bidder.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = bid.bump,
        constraint = bid.bidder == bidder.key() @ VoucherExchangeError::NotBidder
    )]
    pub bid: Account<'info, VoucherBid>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    // Using InterfaceAccount instead of Account for token accounts
    pub nft_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [
        ESCROW_SEED,
        // Removed exchange.key().as_ref(),
        bidder.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = bid.escrow_bump
    )]
    pub escrow_account: InterfaceAccount<'info, TokenAccount>,

    pub payment_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = bidder_token_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = bidder_token_account.owner == bidder.key() @ VoucherExchangeError::NotBidder
    )]
    pub bidder_token_account: InterfaceAccount<'info, TokenAccount>,

    // Using TokenInterface instead of Token
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CancelVoucherBid>,
) -> Result<()> {
    // Check bid is active
    require!(ctx.accounts.bid.active, VoucherExchangeError::BidNotActive);

    // Refund from escrow - set up seeds with proper lifetimes
    let escrow_seed = ESCROW_SEED;
    // Removed exchange_key as it's no longer used in seeds
    let bidder_key = ctx.accounts.bidder.key();
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let escrow_bump = ctx.accounts.bid.escrow_bump;

    // Create the seeds array with the correct lifetime
    let escrow_seeds = &[
        escrow_seed,
        // Removed exchange_key.as_ref(),
        bidder_key.as_ref(),
        nft_mint_key.as_ref(),
        &[escrow_bump],
    ];

    // Create a reference to the seeds array with the right structure for CPI
    let signer_seeds = &[&escrow_seeds[..]];

    // Use transfer_checked instead of transfer
   transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.escrow_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(), // Add mint for transfer_checked
                to: ctx.accounts.bidder_token_account.to_account_info(),
                authority: ctx.accounts.escrow_account.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.bid.price,
        ctx.accounts.payment_mint.decimals, // Add decimals for transfer_checked
    )?;

    // Mark bid as inactive
    ctx.accounts.bid.active = false;

    Ok(())
}
