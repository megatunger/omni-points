use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;
pub mod constants;

use instructions::*;

declare_id!("CnupugmHFWwcaq1wnK9xfUibxX2LDaPbjQp9aA7trHjL");

#[program]
pub mod voucher_exchange {
    use super::*;

    pub fn initialize_exchange(
        ctx: Context<InitializeExchange>
    ) -> Result<()> {
        instructions::initialize_exchange::handler(ctx)
    }

    pub fn create_voucher_listing(
        ctx: Context<CreateVoucherListing>,
        price: u64,
    ) -> Result<()> {
        instructions::create_voucher_listing::handler(ctx, price)
    }

    pub fn create_voucher_bid(
        ctx: Context<CreateVoucherBid>,
        price: u64,
        escrow_bump: u8
    ) -> Result<()> {
        instructions::create_voucher_bid::handler(ctx, price, escrow_bump)
    }

    pub fn accept_voucher_bid(
        ctx: Context<AcceptVoucherBid>
    ) -> Result<()> {
        instructions::accept_voucher_bid::handler(ctx)
    }

    pub fn fulfill_voucher_listing(
        ctx: Context<FulfillVoucherListing>
    ) -> Result<()> {
        instructions::fulfill_voucher_listing::handler(ctx)
    }

    pub fn cancel_voucher_listing(
        ctx: Context<CancelVoucherListing>
    ) -> Result<()> {
        instructions::cancel_voucher_listing::handler(ctx)
    }

    pub fn cancel_voucher_bid(
        ctx: Context<CancelVoucherBid>
    ) -> Result<()> {
        instructions::cancel_voucher_bid::handler(ctx)
    }

    pub fn mark_bid_for_refund(
        ctx: Context<MarkBidForRefund>
    ) -> Result<()> {
        instructions::mark_bid_for_refund::handler(ctx)
    }

    pub fn refund_bid(
        ctx: Context<RefundBid>
    ) -> Result<()> {
        instructions::refund_bid::handler(ctx)
    }
}
