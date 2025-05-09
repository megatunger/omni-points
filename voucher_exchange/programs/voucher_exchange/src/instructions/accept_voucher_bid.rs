use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    TokenAccount as TokenAccountInterface, Mint as MintInterface, TokenInterface,
    TransferChecked, transfer_checked, CloseAccount, close_account
};
use anchor_spl::token::{Token, Mint, TokenAccount, transfer}; // Add standard Token and Mint imports
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(params: AcceptVoucherBidParams)]  // Add this line to derive Bumps
pub struct AcceptVoucherBid<'info> {
    #[account(
        mut,
        seeds = [
            VOUCHER_BID_SEED,
            bidder.key().as_ref(),
            nft_mint.key().as_ref()
        ],
        bump = bid.bump,
        constraint = bid.active == true @ VoucherExchangeError::BidNotActive,
        close = owner
    )]
    pub bid: Account<'info, VoucherBid>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Account of the bidder
    #[account(mut, constraint = bidder.key() == bid.bidder @ VoucherExchangeError::NotBidder)]
    pub bidder: AccountInfo<'info>,

    // Changed to regular Mint instead of InterfaceAccount
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = escrow_nft_account.mint == nft_mint.key() @ VoucherExchangeError::InvalidNFTAccount,
        constraint = escrow_nft_account.key() == listing.nft_account @ VoucherExchangeError::InvalidNFTAccount
    )]
    pub escrow_nft_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            VOUCHER_LISTING_SEED,
            owner.key().as_ref(),
            nft_mint.key().as_ref()
        ],
        bump = listing.bump,
        constraint = listing.active == true @ VoucherExchangeError::ListingNotActive,
        constraint = listing.owner == owner.key() @ VoucherExchangeError::NotListingOwner,
        close = owner
    )]
    pub listing: Account<'info, VoucherListing>,

    #[account(
        mut,
        constraint = bidder_nft_account.mint == nft_mint.key(),
        constraint = bidder_nft_account.owner == bidder.key(),
    )]
    pub bidder_nft_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub payment_mint: InterfaceAccount<'info, MintInterface>,

    #[account(
        mut,
        constraint = escrow_payment_account.key() == bid.escrow_account @ VoucherExchangeError::InvalidBidState,
        constraint = escrow_payment_account.mint == payment_mint.key() @ VoucherExchangeError::InvalidPrice
    )]
    pub escrow_payment_account: InterfaceAccount<'info, TokenAccountInterface>,

    #[account(
        mut,
        constraint = owner_payment_account.mint == payment_mint.key(),
        constraint = owner_payment_account.owner == owner.key(),
    )]
    pub owner_payment_account: InterfaceAccount<'info, TokenAccountInterface>,

    #[account(mut)]
    pub exchange: Account<'info, VoucherExchange>,

    pub token_program: Interface<'info, TokenInterface>,

    // Changed to standard Token program
    pub token_nft_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// Add this struct to derive Bumps
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AcceptVoucherBidParams {}

pub fn handler(
    ctx: Context<AcceptVoucherBid>,
) -> Result<()> {
    // Check NFT amount in escrow
    require!(
        ctx.accounts.escrow_nft_account.amount == 1,
        VoucherExchangeError::InsufficientNFTAmount
    );

    // Get price from bid
    let price = ctx.accounts.bid.price;

    // Transfer payment from escrow to seller
    let (bid_bump, listing_bump) = (ctx.accounts.bid.bump, ctx.accounts.listing.bump);
    let bidder_key = ctx.accounts.bidder.key();
    let owner_key = ctx.accounts.owner.key();
    let nft_mint_key = ctx.accounts.nft_mint.key();

    let payment_token_program = ctx.accounts.token_program.to_account_info();

    // Get bid seeds for signing
    let escrow_seeds = &[
        ESCROW_SEED,
        bidder_key.as_ref(),
        nft_mint_key.as_ref(),
        &[ctx.accounts.bid.escrow_bump],
    ];

    let escrow_signer_seeds = &[&escrow_seeds[..]];

    // 1. Transfer payment from escrow to owner
    transfer_checked(
        CpiContext::new_with_signer(
            payment_token_program.clone(),
            TransferChecked {
                from: ctx.accounts.escrow_payment_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.owner_payment_account.to_account_info(),
                authority: ctx.accounts.escrow_payment_account.to_account_info(),
            },
            escrow_signer_seeds,
        ),
        price,
        ctx.accounts.payment_mint.decimals,
    )?;

    // 2. Close escrow payment account and return rent to bidder
    close_account(
        CpiContext::new_with_signer(
            payment_token_program,
            CloseAccount {
                account: ctx.accounts.escrow_payment_account.to_account_info(),
                destination: ctx.accounts.bidder.to_account_info(), // Rent goes back to the bidder
                authority: ctx.accounts.escrow_payment_account.to_account_info(),
            },
             escrow_signer_seeds,
        )
    )?;

    // Get listing seeds for signing
    let listing_seeds = &[
        VOUCHER_LISTING_SEED,
        owner_key.as_ref(),
        nft_mint_key.as_ref(),
        &[listing_bump],
    ];

    let listing_signer_seeds = &[&listing_seeds[..]];

    let nft_token_program = ctx.accounts.token_nft_program.to_account_info();

    // 3. Transfer NFT from escrow to bidder
    transfer(
        CpiContext::new_with_signer(
            nft_token_program.clone(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.escrow_nft_account.to_account_info(),
                to: ctx.accounts.bidder_nft_account.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            listing_signer_seeds,
        ),
        1,
    )?;

    // 4. Close the escrow NFT account and send rent back to the owner
    close_account(
        CpiContext::new_with_signer(
            nft_token_program,
            CloseAccount {
                account: ctx.accounts.escrow_nft_account.to_account_info(),
                destination: ctx.accounts.owner.to_account_info(), // Rent goes back to the owner
                authority: ctx.accounts.listing.to_account_info(),
            },
            listing_signer_seeds,
        )
    )?;

    // Update exchange statistics
    let exchange = &mut ctx.accounts.exchange;
    exchange.total_bids = exchange.total_bids.checked_sub(1).unwrap_or(0);
    exchange.total_listings = exchange.total_listings.checked_sub(1).unwrap_or(0);

    Ok(())
}
