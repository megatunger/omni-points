// Second function with TokenInterface
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface,
    TransferChecked
};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct RefundBid<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_BID_SEED,
        bidder.key().as_ref(),
        nft_mint.key().as_ref(),
        ],
        bump = bid.bump,
        constraint = bid.active == true @ VoucherExchangeError::BidNotActive,
        constraint = bid.requires_refund == true @ VoucherExchangeError::BidNotRequiresRefund,
    )]
    pub bid: Account<'info, VoucherBid>,

    // The bidder must be the signer to claim refund
    #[account(
        mut,
        constraint = bidder.key() == bid.bidder @ VoucherExchangeError::NotBidder,
    )]
    pub bidder: Signer<'info>,

    // The NFT mint is now part of the account derivation
    pub nft_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [
        ESCROW_SEED,
        bidder.key().as_ref(),
        nft_mint.key().as_ref(),
        ],
        bump = bid.escrow_bump
    )]
    pub escrow_account: InterfaceAccount<'info, TokenAccount>,

    pub payment_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = bidder_token_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = bidder_token_account.owner == bid.bidder @ VoucherExchangeError::NotBidder,
    )]
    pub bidder_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
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
    let bidder_key = ctx.accounts.bidder.key();
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let escrow_bump = ctx.accounts.bid.escrow_bump;

    // Create the seeds array with the correct lifetime
    let escrow_seeds = &[
        escrow_seed,
        bidder_key.as_ref(),
        nft_mint_key.as_ref(),
        &[escrow_bump],
    ];

    // Create a longer-lived binding for signer seeds
    let signer_seeds = &[&escrow_seeds[..]];

    // Create CPI context with signer seeds and use transfer_checked instead of transfer
    anchor_spl::token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.escrow_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.bidder_token_account.to_account_info(),
                authority: ctx.accounts.escrow_account.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.bid.price,
        ctx.accounts.payment_mint.decimals,
    )?;

    // Mark bid as inactive and no longer requiring refund
    ctx.accounts.bid.active = false;
    ctx.accounts.bid.requires_refund = false;

    Ok(())
}