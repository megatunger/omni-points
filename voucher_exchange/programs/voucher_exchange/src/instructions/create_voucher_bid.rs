use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface,
    TransferChecked
};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(price: u64, escrow_bump: u8)]
pub struct CreateVoucherBid<'info> {
    #[account(
        init_if_needed,
        payer = bidder,
        space = VoucherBid::SIZE,
        seeds = [
        VOUCHER_BID_SEED,
        bidder.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump
    )]
    pub bid: Account<'info, VoucherBid>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub nft_mint: InterfaceAccount<'info, Mint>,

    pub payment_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = bidder_token_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = bidder_token_account.owner == bidder.key() @ VoucherExchangeError::NotBidder
    )]
    pub bidder_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = bidder,
        seeds = [
        ESCROW_SEED,
        bidder.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump,
        token::mint = payment_mint,
        token::authority = escrow_account
    )]
    pub escrow_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateVoucherBid>,
    price: u64,
    escrow_bump: u8,
) -> Result<()> {
    // Check price is valid
    require!(price > 0, VoucherExchangeError::InvalidPrice);

    // Check sufficient balance
    require!(
        ctx.accounts.bidder_token_account.amount >= price,
        VoucherExchangeError::InsufficientFunds
    );

    // Transfer token to escrow using transfer_checked
    anchor_spl::token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.bidder_token_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.escrow_account.to_account_info(),
                authority: ctx.accounts.bidder.to_account_info(),
            },
        ),
        price,
        ctx.accounts.payment_mint.decimals,
    )?;

    // Create new bid
    let bid = &mut ctx.accounts.bid;
    bid.bidder = ctx.accounts.bidder.key();
    bid.nft_mint = ctx.accounts.nft_mint.key();
    bid.price = price;
    bid.payment_mint = ctx.accounts.payment_mint.key();
    bid.escrow_account = ctx.accounts.escrow_account.key();
    bid.active = true;
    bid.requires_refund = false;  // Initially doesn't require refund
    bid.bump = ctx.bumps.bid;
    bid.escrow_bump = escrow_bump;

    // Increment total bids
    let exchange = &mut ctx.accounts.exchange;
    exchange.total_bids = exchange.total_bids.checked_add(1).unwrap();

    Ok(())
}
