use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount as TokenAccountInterface, Mint as MintInterface, TokenInterface,
    TransferChecked, transfer_checked, CloseAccount, close_account
};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(params: CancelVoucherBidParams)]  // Add this line to derive Bumps
pub struct CancelVoucherBid<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_BID_SEED,
        bidder.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = bid.bump,
        constraint = bid.bidder == bidder.key() @ VoucherExchangeError::NotBidder,
        close = bidder  // Close the bid account and return rent to bidder
    )]
    pub bid: Account<'info, VoucherBid>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    // Using InterfaceAccount for mints
    pub nft_mint: InterfaceAccount<'info, MintInterface>,

    #[account(
        mut,
        seeds = [
        ESCROW_SEED,
        bidder.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = bid.escrow_bump
    )]
    pub escrow_account: InterfaceAccount<'info, TokenAccountInterface>,

    pub payment_mint: InterfaceAccount<'info, MintInterface>,

    #[account(
        mut,
        constraint = bidder_token_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = bidder_token_account.owner == bidder.key() @ VoucherExchangeError::NotBidder
    )]
    pub bidder_token_account: InterfaceAccount<'info, TokenAccountInterface>,

    // Using TokenInterface
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

// Add this struct to derive Bumps
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CancelVoucherBidParams {}

pub fn handler(
    ctx: Context<CancelVoucherBid>,
) -> Result<()> {
    // Check bid is active
    require!(ctx.accounts.bid.active, VoucherExchangeError::BidNotActive);

    // Refund from escrow - set up seeds with proper lifetimes
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

    // Create a reference to the seeds array with the right structure for CPI
    let signer_seeds = &[&escrow_seeds[..]];

    let token_program = ctx.accounts.token_program.to_account_info();

    // 1. Transfer funds from escrow back to the bidder
    transfer_checked(
        CpiContext::new_with_signer(
            token_program.clone(),
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

    // 2. Close the escrow token account and return rent to the bidder
    close_account(
        CpiContext::new_with_signer(
            token_program,
            CloseAccount {
                account: ctx.accounts.escrow_account.to_account_info(),
                destination: ctx.accounts.bidder.to_account_info(),
                authority: ctx.accounts.escrow_account.to_account_info(),
            },
            signer_seeds,
        )
    )?;

    // No need to mark bid as inactive since we're closing the account
    // ctx.accounts.bid.active = false;

    Ok(())
}
