use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
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
        exchange.key().as_ref(),
        owner.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = listing.bump,
        constraint = listing.active == true @ VoucherExchangeError::ListingNotActive
    )]
    pub listing: Account<'info, VoucherListing>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Case where listing.owner doesn't sign
    #[account(mut, constraint = owner.key() == listing.owner @ VoucherExchangeError::NotListingOwner)]
    pub owner: AccountInfo<'info>,

    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,

    // Create or update NFT state
    #[account(
        init_if_needed,
        payer = buyer,
        space = VoucherState::SIZE,
        seeds = [
        VOUCHER_STATE_SEED,
        exchange.key().as_ref(),
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
    pub nft_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer
    )]
    pub buyer_nft_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub payment_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = buyer_payment_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = buyer_payment_account.owner == buyer.key() @ VoucherExchangeError::NotBidder
    )]
    pub buyer_payment_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = payment_mint,
        associated_token::authority = owner
    )]
    pub owner_payment_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = fee_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice,
        constraint = fee_account.key() == exchange.fee_account @ VoucherExchangeError::NotExchangeAuthority
    )]
    pub fee_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
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

    // Calculate fee
    let fee_basis_points = ctx.accounts.exchange.fee_basis_points as u64;
    let fee_amount = price
        .checked_mul(fee_basis_points as u64)
        .unwrap()
        .checked_div(BASIS_POINTS_DIVISOR as u64)
        .unwrap();
    let seller_amount = price.checked_sub(fee_amount).unwrap();

    // 1. Transfer payment from buyer to seller
    let payment_transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.buyer_payment_account.to_account_info(),
            to: ctx.accounts.owner_payment_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        },
    );

    token::transfer(payment_transfer_ctx, seller_amount)?;

    // 2. Transfer fee to exchange (if any)
    if fee_amount > 0 {
        let fee_payment_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_payment_account.to_account_info(),
                to: ctx.accounts.fee_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );

        token::transfer(fee_payment_ctx, fee_amount)?;
    }

    // 3. Transfer NFT to buyer
    let exchange_key = ctx.accounts.exchange.key();
    let owner_key = ctx.accounts.owner.key();
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let bump = ctx.accounts.listing.bump;

    let listing_seeds = &[
        VOUCHER_LISTING_SEED,
        exchange_key.as_ref(),
        owner_key.as_ref(),
        nft_mint_key.as_ref(),
        &[bump],
    ];

    let signer_seeds = &[&listing_seeds[..]];

    let nft_transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.nft_account.to_account_info(),
            to: ctx.accounts.buyer_nft_account.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(), // Use listing as authority
        },
        signer_seeds,
    );

    token::transfer(nft_transfer_ctx, 1)?;

    // Mark listing as inactive
    ctx.accounts.listing.active = false;

    // Update NFT state to mark as sold
    let nft_state = &mut ctx.accounts.nft_state;
    nft_state.nft_mint = ctx.accounts.nft_mint.key();
    nft_state.sold = true;
    nft_state.latest_sale_timestamp = Clock::get()?.unix_timestamp;
    nft_state.exchange = ctx.accounts.exchange.key();
    nft_state.bump = ctx.bumps.nft_state;

    Ok(())
}