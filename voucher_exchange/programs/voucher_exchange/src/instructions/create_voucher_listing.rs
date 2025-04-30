use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface
};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(price: u64)]
pub struct CreateVoucherListing<'info> {
    #[account(
        init,
        payer = owner,
        space = VoucherListing::SIZE,
        seeds = [
        VOUCHER_LISTING_SEED,
        // Removed exchange.key().as_ref(),
        owner.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump
    )]
    pub listing: Account<'info, VoucherListing>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub owner: Signer<'info>,

    // Use TokenInterface::Mint instead of Mint
    pub nft_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = nft_account.mint == nft_mint.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = nft_account.owner == owner.key() @ VoucherExchangeError::NotNFTOwner
    )]
    // Use TokenInterface::TokenAccount instead of TokenAccount
    pub nft_account: InterfaceAccount<'info, TokenAccount>,

    // Same for payment mint
    pub payment_mint: InterfaceAccount<'info, Mint>,

    // Use TokenInterface instead of Token
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateVoucherListing>,
    price: u64,
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
    listing.bump = ctx.bumps.listing;

    // Approve authority delegation to listing PDA
    // Use TokenInterface approve instead of token::approve
    anchor_spl::token_interface::approve(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::Approve {
                to: ctx.accounts.nft_account.to_account_info(),
                delegate: listing.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        1, // Approve amount of 1 for NFT
    )?;

    // Increment total listings
    let exchange = &mut ctx.accounts.exchange;
    exchange.total_listings = exchange.total_listings.checked_add(1).unwrap();

    Ok(())
}