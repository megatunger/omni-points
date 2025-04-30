use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface,
    TransferChecked, transfer_checked
};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct FulfillVoucherListing<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_LISTING_SEED,
        // Removed exchange.key().as_ref(),
        owner.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = listing.bump,
        constraint = listing.active == true @ VoucherExchangeError::ListingNotActive
    )]
    pub listing: Account<'info, VoucherListing>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Case where listing.owner doesn't sign
    #[account(mut, constraint = owner.key() == listing.owner @ VoucherExchangeError::NotListingOwner)]
    pub owner: AccountInfo<'info>,

    #[account(mut)]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    // Create or update NFT state
    #[account(
        init_if_needed,
        payer = buyer,
        space = VoucherState::SIZE,
        seeds = [
        VOUCHER_STATE_SEED,
        // Removed exchange.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump
    )]
    pub nft_state: Account<'info, VoucherState>,

    #[account(
        mut,
        constraint = nft_account.mint == nft_mint.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = nft_account.owner == owner.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = nft_account.key() == listing.nft_account @ VoucherExchangeError::NotNFTOwner
    )]
    pub nft_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer
    )]
    pub buyer_nft_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub payment_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = buyer_payment_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = buyer_payment_account.owner == buyer.key() @ VoucherExchangeError::NotBidder
    )]
    pub buyer_payment_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = payment_mint,
        associated_token::authority = owner
    )]
    pub owner_payment_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(
    ctx: Context<FulfillVoucherListing>,
) -> Result<()> {
    // Check balance
    let price = ctx.accounts.listing.price;
    require!(
        ctx.accounts.buyer_payment_account.amount >= price,
        VoucherExchangeError::InsufficientFunds
    );

    // Check NFT amount
    require!(
        ctx.accounts.nft_account.amount == 1,
        VoucherExchangeError::InsufficientNFTAmount
    );

    // 1. Transfer full payment from buyer to seller (no fees)
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.buyer_payment_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.owner_payment_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        price, // Transfer the full price to the seller
        ctx.accounts.payment_mint.decimals,
    )?;

    // 2. Transfer NFT to buyer
    // Removed exchange_key as it's no longer needed in seeds
    let owner_key = ctx.accounts.owner.key();
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let bump = ctx.accounts.listing.bump;

    let listing_seeds = &[
        VOUCHER_LISTING_SEED,
        owner_key.as_ref(),
        nft_mint_key.as_ref(),
        &[bump],
    ];

    let signer_seeds = &[&listing_seeds[..]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.nft_account.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.buyer_nft_account.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(), // Use listing as authority
            },
            signer_seeds,
        ),
        1,
        ctx.accounts.nft_mint.decimals,
    )?;

    // Mark listing as inactive
    ctx.accounts.listing.active = false;

    // Update NFT state to mark as sold
    let nft_state = &mut ctx.accounts.nft_state;
    nft_state.nft_mint = ctx.accounts.nft_mint.key();
    nft_state.sold = true;
    nft_state.latest_sale_timestamp = Clock::get()?.unix_timestamp;
    nft_state.bump = ctx.bumps.nft_state;

    Ok(())
}