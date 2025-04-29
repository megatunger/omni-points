use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct RefundBid<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_BID_SEED,
        exchange.key().as_ref(),
        bidder.key().as_ref(),
        nft_mint.key().as_ref(),
        ],
        bump = bid.bump,
        constraint = bid.active == true @ VoucherExchangeError::BidNotActive,
        constraint = bid.requires_refund == true @ VoucherExchangeError::BidNotRequiresRefund,
    )]
    pub bid: Account<'info, VoucherBid>,
    pub exchange: Account<'info, VoucherExchange>,

    // The bidder must be the signer to claim refund
    #[account(
        mut,
        constraint = bidder.key() == bid.bidder @ VoucherExchangeError::NotBidder,
    )]
    pub bidder: Signer<'info>,

    // The NFT mint is now part of the account derivation
    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [
        ESCROW_SEED,
        exchange.key().as_ref(),
        bidder.key().as_ref(),
        nft_mint.key().as_ref(),
        ],
        bump = bid.escrow_bump
    )]
    pub escrow_account: Account<'info, TokenAccount>,
    pub payment_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = bidder_token_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = bidder_token_account.owner == bid.bidder @ VoucherExchangeError::NotBidder,
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RefundBid>,
) -> Result<()> {
    // Check bid requires refund
    require!(
        ctx.accounts.bid.requires_refund,
        VoucherExchangeError::BidNotRequiresRefund
    );

    // Check bid is active
    require!(ctx.accounts.bid.active, VoucherExchangeError::BidNotActive);

    // Refund from escrow
    let escrow_seed = ESCROW_SEED;
    let exchange_key = ctx.accounts.exchange.key();
    let bidder_key = ctx.accounts.bidder.key();
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let escrow_bump = ctx.accounts.bid.escrow_bump;

    // Create the seeds array with the correct lifetime
    let escrow_seeds = &[
        escrow_seed,
        exchange_key.as_ref(),
        bidder_key.as_ref(),
        nft_mint_key.as_ref(),
        &[escrow_bump],
    ];

    // Create a longer-lived binding for signer seeds
    let signer_seeds = &[&escrow_seeds[..]];

    // Create CPI context with signer seeds
    let refund_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow_account.to_account_info(),
            to: ctx.accounts.bidder_token_account.to_account_info(),
            authority: ctx.accounts.escrow_account.to_account_info(),
        },
        signer_seeds,
    );

    // Perform the transfer
    token::transfer(refund_ctx, ctx.accounts.bid.price)?;

    // Mark bid as inactive and no longer requiring refund
    ctx.accounts.bid.active = false;
    ctx.accounts.bid.requires_refund = false;

    Ok(())
}