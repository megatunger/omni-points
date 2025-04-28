use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(price: u64, listing_id: u64)]
pub struct CreateVoucherListing<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 32 + 8 + 32 + 1 + 8 + 32 + 1,
        seeds = [
        VOUCHER_LISTING_SEED,
        exchange.key().as_ref(),
        &listing_id.to_le_bytes()
        ],
        bump
    )]
    pub listing: Account<'info, VoucherListing>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = nft_account.mint == nft_mint.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = nft_account.owner == owner.key() @ VoucherExchangeError::NotNFTOwner
    )]
    pub nft_account: Account<'info, TokenAccount>,

    pub payment_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateVoucherListing>,
    price: u64,
    listing_id: u64,
) -> Result<()> {
    // Check price is valid
    require!(price > 0, VoucherExchangeError::InvalidPrice);

    // Check NFT amount
    require!(
        ctx.accounts.nft_account.amount == 1,
        VoucherExchangeError::InsufficientNFTAmount
    );

    // Create new listing
    let listing = &mut ctx.accounts.listing;
    listing.owner = ctx.accounts.owner.key();
    listing.nft_mint = ctx.accounts.nft_mint.key();
    listing.nft_account = ctx.accounts.nft_account.key();
    listing.price = price;
    listing.payment_mint = ctx.accounts.payment_mint.key();
    listing.active = true;
    listing.listing_id = listing_id;
    listing.exchange = ctx.accounts.exchange.key();
    listing.bump = ctx.bumps.listing;

    // Increment total listings
    let exchange = &mut ctx.accounts.exchange;
    exchange.total_listings = exchange.total_listings.checked_add(1).unwrap();

    // Approve the listing PDA to transfer the NFT on behalf of the owner
    let approve_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token::Approve {
            to: ctx.accounts.nft_account.to_account_info(),
            delegate: ctx.accounts.listing.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );
    anchor_spl::token::approve(approve_ctx, 1)?;

    Ok(())
}