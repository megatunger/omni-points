use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface, TransferChecked, transfer_checked
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

    pub nft_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = owner_nft_account.mint == nft_mint.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = owner_nft_account.owner == owner.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = owner_nft_account.amount == 1 @ VoucherExchangeError::InsufficientNFTAmount
    )]
    pub owner_nft_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        seeds = [
            ESCROW_SEED,
            nft_mint.key().as_ref()
        ],
        bump,
        token::mint = nft_mint,
        token::authority = listing
    )]
    pub escrow_nft_account: InterfaceAccount<'info, TokenAccount>,

    pub payment_mint: InterfaceAccount<'info, Mint>,
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

    // Create new listing
    let listing = &mut ctx.accounts.listing;
    listing.owner = ctx.accounts.owner.key();
    listing.nft_mint = ctx.accounts.nft_mint.key();
    listing.nft_account = ctx.accounts.escrow_nft_account.key(); // Store escrow account instead
    listing.price = price;
    listing.payment_mint = ctx.accounts.payment_mint.key();
    listing.active = true;
    listing.bump = ctx.bumps.listing;
    // Removed: listing.escrow_bump = ctx.bumps.escrow_nft_account;

    // Transfer NFT to the escrow account
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.owner_nft_account.to_account_info(),
                to: ctx.accounts.escrow_nft_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
            },
        ),
        1, // Amount (1 for NFT)
        ctx.accounts.nft_mint.decimals, // Decimals
    )?;

    // Increment total listings
    let exchange = &mut ctx.accounts.exchange;
    exchange.total_listings = exchange.total_listings.checked_add(1).unwrap();

    Ok(())
}
