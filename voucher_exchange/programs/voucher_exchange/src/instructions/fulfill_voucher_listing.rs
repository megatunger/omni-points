use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount as TokenAccountInterface, Mint as MintInterface, TokenInterface,
    TransferChecked, transfer_checked, CloseAccount, close_account
};
use anchor_spl::token::{Token, Mint, TokenAccount}; // Add standard Token and Mint imports
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
            owner.key().as_ref(),
            nft_mint.key().as_ref()
        ],
        bump = listing.bump,
        constraint = listing.active == true @ VoucherExchangeError::ListingNotActive,
        close = owner  // Add this to close the listing account and return rent to owner
    )]
    pub listing: Account<'info, VoucherListing>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Case where listing.owner doesn't sign
    #[account(mut, constraint = owner.key() == listing.owner @ VoucherExchangeError::NotListingOwner)]
    pub owner: AccountInfo<'info>,

    // Changed from InterfaceAccount<'info, Mint> to Account<'info, Mint>
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,

    // Create or update NFT state
    #[account(
        init_if_needed,
        payer = buyer,
        space = VoucherState::SIZE,
        seeds = [
            VOUCHER_STATE_SEED,
            nft_mint.key().as_ref()
        ],
        bump
    )]
    pub nft_state: Account<'info, VoucherState>,

    #[account(
        mut,
        constraint = escrow_nft_account.mint == nft_mint.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = escrow_nft_account.owner == listing.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = escrow_nft_account.key() == listing.nft_account @ VoucherExchangeError::NotNFTOwner
    )]
    pub escrow_nft_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = buyer_nft_account.mint == nft_mint.key(),
        constraint = buyer_nft_account.owner == buyer.key(),
    )]
    pub buyer_nft_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub payment_mint: InterfaceAccount<'info, MintInterface>,

    #[account(
        mut,
        constraint = buyer_payment_account.mint == payment_mint.key(),
        constraint = buyer_payment_account.owner == buyer.key(),
    )]
    pub buyer_payment_account: InterfaceAccount<'info, TokenAccountInterface>,

    #[account(
        mut,
        constraint = owner_payment_account.mint == payment_mint.key(),
        constraint = owner_payment_account.owner == owner.key(),
    )]
    pub owner_payment_account: InterfaceAccount<'info, TokenAccountInterface>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    pub token_program: Interface<'info, TokenInterface>,

    // Use the standard Token Program directly
    pub token_nft_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
}

pub fn handler(ctx: Context<FulfillVoucherListing>) -> Result<()> {
    // Check balance
    let price = ctx.accounts.listing.price;
    require!(
        ctx.accounts.buyer_payment_account.amount >= price,
        VoucherExchangeError::InsufficientFunds
    );

    // Check NFT amount
    require!(
        ctx.accounts.escrow_nft_account.amount == 1,
        VoucherExchangeError::InsufficientNFTAmount
    );

    let payment_token_program = ctx.accounts.token_program.to_account_info();

    // 1. Transfer full payment from buyer to seller (no fees)
    transfer_checked(
        CpiContext::new(
            payment_token_program,
            TransferChecked {
                from: ctx.accounts.buyer_payment_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.owner_payment_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        price,
        ctx.accounts.payment_mint.decimals,
    )?;

    let nft_token_program = ctx.accounts.token_nft_program.to_account_info();

    // 2. Transfer NFT from escrow to buyer
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
            nft_token_program.clone(),
            TransferChecked {
                from: ctx.accounts.escrow_nft_account.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.buyer_nft_account.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(), // Listing is the authority for escrow
            },
            signer_seeds,
        ),
        1,
        ctx.accounts.nft_mint.decimals,
    )?;

    // 3. Close the escrow NFT account and send rent back to the owner
    close_account(
        CpiContext::new_with_signer(
            nft_token_program,
            CloseAccount {
                account: ctx.accounts.escrow_nft_account.to_account_info(),
                destination: ctx.accounts.owner.to_account_info(), // Rent goes back to the owner
                authority: ctx.accounts.listing.to_account_info(),
            },
            signer_seeds,
        )
    )?;

    // Update NFT state to mark as sold
    let nft_state = &mut ctx.accounts.nft_state;
    nft_state.nft_mint = ctx.accounts.nft_mint.key();
    nft_state.sold = true;
    nft_state.latest_sale_timestamp = Clock::get()?.unix_timestamp;
    nft_state.bump = ctx.bumps.nft_state;

    // Decrement total listings in exchange
    let exchange = &mut ctx.accounts.exchange;
    exchange.total_listings = exchange.total_listings.checked_sub(1).unwrap_or(0);


    Ok(())
}
