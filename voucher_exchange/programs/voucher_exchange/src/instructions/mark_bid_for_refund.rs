use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::constants::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
#[instruction(bid_id: u64)]
pub struct MarkBidForRefund<'info> {
    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    #[account(
        constraint = authority.key() == exchange.authority @ VoucherExchangeError::NotExchangeAuthority,
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [
        VOUCHER_STATE_SEED,
        exchange.key().as_ref(),
        nft_mint.key().as_ref()
        ],
        bump = nft_state.bump,
        constraint = nft_state.sold == true @ VoucherExchangeError::NFTAlreadySold,
    )]
    pub nft_state: Account<'info, VoucherState>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [
        VOUCHER_BID_SEED,
        exchange.key().as_ref(),
        &bid_id.to_le_bytes()
        ],
        bump = bid.bump,
        constraint = bid.nft_mint == nft_mint.key() @ VoucherExchangeError::NotBidder,
        constraint = bid.active == true @ VoucherExchangeError::BidNotActive,
    )]
    pub bid: Account<'info, VoucherBid>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<MarkBidForRefund>,
    bid_id: u64
) -> Result<()> {
    // Ensure we have a valid NFT state that's already been sold
    require!(ctx.accounts.nft_state.sold, VoucherExchangeError::NFTAlreadySold);

    // Log which bid we're marking for refund
    msg!("Marking bid ID {} for refund", bid_id);

    // Check that this bid is not already marked for refund
    require!(!ctx.accounts.bid.requires_refund, VoucherExchangeError::BidNotRequiresRefund);

    // Mark the bid as requiring refund
    let bid = &mut ctx.accounts.bid;
    bid.requires_refund = true;

    msg!("Successfully marked bid ID {} for refund", bid_id);

    Ok(())
}