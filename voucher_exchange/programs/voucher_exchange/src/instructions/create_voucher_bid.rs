use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(price: u64, bid_id: u64, escrow_bump: u8)]
pub struct CreateVoucherBid<'info> {
    #[account(
        init_if_needed,
        payer = bidder,
        space = 8 + 32 + 32 + 8 + 32 + 32 + 1 + 1 + 8 + 32 + 1 + 1,
        seeds = [
        VOUCHER_BID_SEED,
        exchange.key().as_ref(),
        &bid_id.to_le_bytes()
        ],
        bump
    )]
    pub bid: Account<'info, VoucherBid>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub nft_mint: Account<'info, Mint>,

    // NFT state is optional (might not exist yet)
    #[account(
        seeds = [
        VOUCHER_STATE_SEED,
        exchange.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump,
        seeds::program = crate::id(),
    )]
    pub nft_state: Option<Account<'info, VoucherState>>,

    pub payment_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = bidder_token_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = bidder_token_account.owner == bidder.key() @ VoucherExchangeError::NotBidder
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = bidder,
        seeds = [
        ESCROW_SEED,
        exchange.key().as_ref(),
        &bid_id.to_le_bytes()
        ],
        bump,
        token::mint = payment_mint,
        token::authority = escrow_account
    )]
    pub escrow_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateVoucherBid>,
    price: u64,
    bid_id: u64,
    escrow_bump: u8,
) -> Result<()> {
    // Check price is valid
    require!(price > 0, VoucherExchangeError::InvalidPrice);

    // Check sufficient balance
    require!(
        ctx.accounts.bidder_token_account.amount >= price,
        VoucherExchangeError::InsufficientFunds
    );

    // Check if NFT has been sold already
    if let Some(nft_state) = &ctx.accounts.nft_state {
        require!(!nft_state.sold, VoucherExchangeError::NFTAlreadySold);
    }

    // Transfer token to escrow
    let transfer_to_escrow_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.bidder_token_account.to_account_info(),
            to: ctx.accounts.escrow_account.to_account_info(),
            authority: ctx.accounts.bidder.to_account_info(),
        },
    );

    token::transfer(transfer_to_escrow_ctx, price)?;

    // Create new bid
    let bid = &mut ctx.accounts.bid;
    bid.bidder = ctx.accounts.bidder.key();
    bid.nft_mint = ctx.accounts.nft_mint.key();
    bid.price = price;
    bid.payment_mint = ctx.accounts.payment_mint.key();
    bid.escrow_account = ctx.accounts.escrow_account.key();
    bid.active = true;
    bid.requires_refund = false;  // Initially doesn't require refund
    bid.bid_id = bid_id;
    bid.exchange = ctx.accounts.exchange.key();
    bid.bump = ctx.bumps.bid;
    bid.escrow_bump = escrow_bump;

    // Increment total bids
    let exchange = &mut ctx.accounts.exchange;
    exchange.total_bids = exchange.total_bids.checked_add(1).unwrap();

    Ok(())
}