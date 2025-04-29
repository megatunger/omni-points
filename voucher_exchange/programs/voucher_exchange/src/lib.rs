use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;
pub mod constants;

use instructions::*;

declare_id!("AQgLTmiMJLXoEtmyVStnNxE6i175WdCwaXdedGD6hgSw");

#[program]
pub mod voucher_exchange {
    use super::*;

    pub fn initialize_exchange(
        ctx: Context<InitializeExchange>,
        fee_basis_points: u16
    ) -> Result<()> {
        instructions::initialize_exchange::handler(ctx, fee_basis_points)
    }

    pub fn create_voucher_listing(
        ctx: Context<CreateVoucherListing>,
        price: u64,
        listing_id: u64
    ) -> Result<()> {
        instructions::create_voucher_listing::handler(ctx, price, listing_id)
    }

    pub fn create_voucher_bid(
        ctx: Context<CreateVoucherBid>,
        price: u64,
        bid_id: u64,
        escrow_bump: u8
    ) -> Result<()> {
        instructions::create_voucher_bid::handler(ctx, price, bid_id, escrow_bump)
    }

    pub fn accept_voucher_bid(
        ctx: Context<AcceptVoucherBid>,
        bid_id: u64
    ) -> Result<()> {
        instructions::accept_voucher_bid::handler(ctx, bid_id)
    }

    pub fn fulfill_voucher_listing(
        ctx: Context<FulfillVoucherListing>,
        listing_id: u64
    ) -> Result<()> {
        instructions::fulfill_voucher_listing::handler(ctx, listing_id)
    }

    pub fn cancel_voucher_listing(
        ctx: Context<CancelVoucherListing>,
        listing_id: u64
    ) -> Result<()> {
        instructions::cancel_voucher_listing::handler(ctx, listing_id)
    }

    pub fn cancel_voucher_bid(
        ctx: Context<CancelVoucherBid>,
        bid_id: u64
    ) -> Result<()> {
        instructions::cancel_voucher_bid::handler(ctx, bid_id)
    }

    pub fn mark_bid_for_refund(
        ctx: Context<MarkBidForRefund>,
        bid_ids: u64
    ) -> Result<()> {
        instructions::mark_bid_for_refund::handler(ctx, bid_ids)
    }

    pub fn refund_bid(
        ctx: Context<RefundBid>,
        bid_id: u64
    ) -> Result<()> {
        instructions::refund_bid::handler(ctx, bid_id)
    }
}
