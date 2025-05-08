use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface, TransferChecked, transfer_checked, CloseAccount, close_account
};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct CancelVoucherListing<'info> {
    #[account(
        mut,
        seeds = [
            VOUCHER_LISTING_SEED,
            owner.key().as_ref(),
            nft_mint.key().as_ref()
        ],
        bump = listing.bump,
        constraint = listing.owner == owner.key() @ VoucherExchangeError::NotListingOwner,
        constraint = listing.active @ VoucherExchangeError::ListingNotActive,
        close = owner
    )]
    pub listing: Account<'info, VoucherListing>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub nft_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = owner_nft_account.mint == nft_mint.key() @ VoucherExchangeError::InvalidNFTAccount,
        constraint = owner_nft_account.owner == owner.key() @ VoucherExchangeError::NotNFTOwner
    )]
    pub owner_nft_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            ESCROW_SEED,
            nft_mint.key().as_ref()
        ],
        bump,
        constraint = escrow_nft_account.mint == nft_mint.key() @ VoucherExchangeError::InvalidNFTAccount,
        constraint = escrow_nft_account.owner == listing.key() @ VoucherExchangeError::InvalidEscrowOwner
    )]
    pub escrow_nft_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CancelVoucherListing>,
) -> Result<()> {
    // Get listing PDA signer seeds
    let listing_bump = ctx.accounts.listing.bump;

    // Create longer-lived values with let bindings
    let owner_key = ctx.accounts.owner.key();
    let nft_mint_key = ctx.accounts.nft_mint.key();

    let listing_seeds = &[
        VOUCHER_LISTING_SEED,
        owner_key.as_ref(),
        nft_mint_key.as_ref(),
        &[listing_bump],
    ];
    let listing_signer = &[&listing_seeds[..]];

    // Transfer NFT from escrow back to owner
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.escrow_nft_account.to_account_info(),
                to: ctx.accounts.owner_nft_account.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
            },
            listing_signer,
        ),
        1, // Amount (1 for NFT)
        ctx.accounts.nft_mint.decimals, // Decimals
    )?;

    // Close the escrow token account to reclaim rent
    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_nft_account.to_account_info(),
                destination: ctx.accounts.owner.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            listing_signer,
        )
    )?;

    // The listing account will be automatically closed due to the close = owner constraint
    // and its lamports will be transferred to the owner

    Ok(())
}
