use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(bid_id: u64)]
pub struct AcceptVoucherBid<'info> {
    #[account(
        mut,
        seeds = [
        VOUCHER_BID_SEED,
        exchange.key().as_ref(),
        &bid_id.to_le_bytes()
        ],
        bump = bid.bump,
        constraint = bid.active == true @ VoucherExchangeError::BidNotActive,
        constraint = bid.nft_mint == nft_mint.key() @ VoucherExchangeError::NotNFTOwner
    )]
    pub bid: Account<'info, VoucherBid>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Case where bid.bidder doesn't sign
    #[account(constraint = bidder.key() == bid.bidder @ VoucherExchangeError::NotBidder)]
    pub bidder: AccountInfo<'info>,

    pub nft_mint: Account<'info, Mint>,

    // Create or update NFT state
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + 32 + 1 + 8 + 32 + 1,
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
        constraint = owner_nft_account.mint == nft_mint.key() @ VoucherExchangeError::NotNFTOwner,
        constraint = owner_nft_account.owner == owner.key() @ VoucherExchangeError::NotNFTOwner
    )]
    pub owner_nft_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = nft_mint,
        associated_token::authority = bidder
    )]
    pub bidder_nft_account: Account<'info, TokenAccount>,

    pub payment_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [
        ESCROW_SEED,
        exchange.key().as_ref(),
        &bid_id.to_le_bytes()
        ],
        bump = bid.escrow_bump
    )]
    pub escrow_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
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
    ctx: Context<AcceptVoucherBid>,
    bid_id: u64,
) -> Result<()> {
    // Check NFT amount
    require!(
        ctx.accounts.owner_nft_account.amount == 1,
        VoucherExchangeError::InsufficientNFTAmount
    );

    // Get price and calculate fee
    let price = ctx.accounts.bid.price;
    let fee_basis_points = ctx.accounts.exchange.fee_basis_points as u64;
    let fee_amount = price
        .checked_mul(fee_basis_points as u64)
        .unwrap()
        .checked_div(BASIS_POINTS_DIVISOR as u64)
        .unwrap();
    let seller_amount = price.checked_sub(fee_amount).unwrap();

    // 1. Transfer NFT to bidder
    let nft_transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.owner_nft_account.to_account_info(),
            to: ctx.accounts.bidder_nft_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );

    token::transfer(nft_transfer_ctx, 1)?;

    // 2. Create the escrow seeds with proper lifetimes
    let escrow_seed = ESCROW_SEED;
    let exchange_key = ctx.accounts.exchange.key();
    let bid_id_bytes = bid_id.to_le_bytes();
    let escrow_bump = ctx.accounts.bid.escrow_bump;

    // Create the seeds array with the correct lifetime
    let escrow_seeds = &[
        escrow_seed,
        exchange_key.as_ref(),
        &bid_id_bytes,
        &[escrow_bump],
    ];

    // Create a reference to the seeds array with the right structure for CPI
    let signer_seeds = &[&escrow_seeds[..]];

    // Transfer payment to seller
    let seller_payment_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow_account.to_account_info(),
            to: ctx.accounts.owner_payment_account.to_account_info(),
            authority: ctx.accounts.escrow_account.to_account_info(),
        },
        signer_seeds,
    );

    token::transfer(seller_payment_ctx, seller_amount)?;

    // 3. Transfer fee to exchange
    if fee_amount > 0 {
        let fee_payment_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: ctx.accounts.fee_account.to_account_info(),
                authority: ctx.accounts.escrow_account.to_account_info(),
            },
            signer_seeds,  // Reuse the same signer_seeds from before
        );

        token::transfer(fee_payment_ctx, fee_amount)?;
    }

    // Mark bid as inactive
    ctx.accounts.bid.active = false;

    // Update or create NFT state to mark NFT as sold
    let nft_state = &mut ctx.accounts.nft_state;
    nft_state.nft_mint = ctx.accounts.nft_mint.key();
    nft_state.sold = true;
    nft_state.latest_sale_timestamp = Clock::get()?.unix_timestamp;
    nft_state.exchange = ctx.accounts.exchange.key();
    nft_state.bump = ctx.bumps.nft_state;

    Ok(())
}