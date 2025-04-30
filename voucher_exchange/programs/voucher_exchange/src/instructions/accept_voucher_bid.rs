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
pub struct AcceptVoucherBid<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_BID_SEED,
        bidder.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = bid.bump,
        constraint = bid.active == true @ VoucherExchangeError::BidNotActive
    )]
    pub bid: Account<'info, VoucherBid>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Account of the bidder (used for PDA derivation)
    #[account(mut, constraint = bidder.key() == bid.bidder @ VoucherExchangeError::NotBidder)]
    pub bidder: AccountInfo<'info>,

    #[account(mut)]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    // Create or update NFT state
    #[account(
        init_if_needed,
        payer = owner,
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
        constraint = owner_nft_account.mint == nft_mint.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = owner_nft_account.owner == owner.key() @ VoucherExchangeError::NotNFTOwner
    )]
    pub owner_nft_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = nft_mint,
        associated_token::authority = bidder
    )]
    pub bidder_nft_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub payment_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = escrow_account.key() == bid.escrow_account @ VoucherExchangeError::InvalidBidState,
        constraint = escrow_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice
    )]
    pub escrow_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
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
    ctx: Context<AcceptVoucherBid>,
) -> Result<()> {
    // Check NFT amount
    require!(
        ctx.accounts.owner_nft_account.amount == 1,
        VoucherExchangeError::InsufficientNFTAmount
    );

    // Calculate fee
    let price = ctx.accounts.bid.price;
    let seller_amount = price;

    // Get escrow seeds
    let bidder_key = ctx.accounts.bidder.key();
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let escrow_bump = ctx.accounts.bid.escrow_bump;

    let escrow_seeds = &[
        ESCROW_SEED,
        // Removed exchange_key.as_ref(),
        bidder_key.as_ref(),
        nft_mint_key.as_ref(),
        &[escrow_bump],
    ];

    let signer_seeds = &[&escrow_seeds[..]];

    // 1. Transfer payment from escrow to seller
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.escrow_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.owner_payment_account.to_account_info(),
                authority: ctx.accounts.escrow_account.to_account_info(),
            },
            signer_seeds,
        ),
        seller_amount,
        ctx.accounts.payment_mint.decimals,
    )?;


    // 3. Transfer NFT from seller to bidder
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.owner_nft_account.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.bidder_nft_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        1,
        ctx.accounts.nft_mint.decimals,
    )?;

    // Mark bid as inactive
    ctx.accounts.bid.active = false;

    // Update NFT state to mark as sold
    let nft_state = &mut ctx.accounts.nft_state;
    nft_state.nft_mint = ctx.accounts.nft_mint.key();
    nft_state.sold = true;
    nft_state.latest_sale_timestamp = Clock::get()?.unix_timestamp;
    nft_state.bump = ctx.bumps.nft_state;

    Ok(())
}