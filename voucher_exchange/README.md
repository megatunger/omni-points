# Voucher Exchange Flow

## Core Instructions

### 1. `initialize_exchange`

**Purpose**: Sets up the marketplace infrastructure and fee structure

**Parameters**:
- `fee_basis_points`: Fee percentage in basis points (1/100 of 1%)

**Validation Logic**:
- Ensures fee doesn't exceed maximum allowed (10% or 1000 basis points)

**Action Flow**:
1. Creates a Program Derived Address (PDA) for the exchange
2. Sets the authority (admin) who can manage the exchange
3. Configures the fee percentage for all future transactions
4. Establishes which account receives fee payments
5. Initializes counters for listings (0) and bids (0)
6. Stores PDA bump for future derivation

**Storage Effects**:
- Creates persistent `VoucherExchange` account with all parameters

### 2. `create_voucher_listing`

**Purpose**: Allows users to list their NFT vouchers for sale

**Parameters**:
- `price`: Asking price for the voucher
- `listing_id`: Unique identifier for the listing

**Validation Logic**:
- Price must be greater than zero
- User must own the NFT being listed
- NFT amount must be exactly 1 (NFT standard)

**Action Flow**:
1. Creates a new PDA for the listing using exchange key and listing ID as seeds
2. Records owner, NFT mint, and token account details
3. Sets listing price and payment token type
4. Marks listing as active
5. Links listing to parent exchange
6. Increments total listings counter on exchange
7. Grants listing PDA authority to transfer the NFT when sold

**Storage Effects**:
- Creates persistent `VoucherListing` account
- Updates `VoucherExchange.total_listings` counter

### 3. `create_voucher_bid`

**Purpose**: Enables users to place bids on NFT vouchers

**Parameters**:
- `price`: Bid amount
- `bid_id`: Unique identifier for the bid
- `escrow_bump`: Bump seed for escrow PDA

**Validation Logic**:
- Price must be greater than zero
- Bidder must have sufficient funds
- If NFT state exists, it must not already be sold

**Action Flow**:
1. Creates a PDA for the bid using exchange key and bid ID as seeds
2. Creates or uses existing escrow account to hold funds
3. Transfers bid amount from bidder to escrow account
4. Records bidder details, NFT mint, bid price
5. Sets bid as active, not requiring refund
6. Links bid to parent exchange
7. Increments total bids counter on exchange

**Storage Effects**:
- Creates persistent `VoucherBid` account
- Creates or updates escrow token account
- Updates `VoucherExchange.total_bids` counter

### 4. `accept_voucher_bid`

**Purpose**: Allows sellers to accept a bid and complete the transaction

**Parameters**:
- `bid_id`: ID of the bid being accepted

**Validation Logic**:
- Bid must be active
- Seller must own the NFT
- NFT amount must be 1
- Bid must match the NFT being sold

**Action Flow**:
1. Calculates marketplace fee (fee_basis_points / 10000 * price)
2. Calculates seller amount (price - fee)
3. Transfers payment from escrow to seller (seller amount)
4. Transfers fee to marketplace fee account
5. Transfers NFT from seller to bidder
6. Marks bid as inactive
7. Creates or updates NFT state to record the sale
8. Records timestamp of sale

**Storage Effects**:
- Updates `VoucherBid.active` to false
- Creates or updates `VoucherState` to record sold status
- Moves tokens between accounts (NFT to buyer, payment to seller)

### 5. `fulfill_voucher_listing`

**Purpose**: Allows direct purchase of a listed NFT at the asking price

**Parameters**:
- `listing_id`: ID of the listing being purchased

**Validation Logic**:
- Listing must be active
- Buyer must have sufficient funds
- NFT amount must be 1
- Seller must still own the NFT in the specified account

**Action Flow**:
1. Calculates marketplace fee
2. Transfers seller amount directly from buyer to seller
3. Transfers fee to marketplace fee account
4. Uses listing PDA's delegated authority to transfer NFT from seller to buyer
5. Marks listing as inactive
6. Creates or updates NFT state to record the sale
7. Records timestamp of sale

**Storage Effects**:
- Updates `VoucherListing.active` to false
- Creates or updates `VoucherState` with sold status
- Moves tokens between accounts (NFT to buyer, payment to seller/fee account)

## Management Instructions

### 6. `cancel_voucher_listing`

**Purpose**: Allows sellers to remove their NFT from the marketplace

**Parameters**:
- `listing_id`: ID of the listing to cancel

**Validation Logic**:
- Only the original lister (owner) can cancel
- Listing must exist

**Action Flow**:
1. Verifies caller is the listing owner
2. Marks listing as inactive

**Storage Effects**:
- Updates `VoucherListing.active` to false (no token movements)

### 7. `cancel_voucher_bid`

**Purpose**: Allows bidders to withdraw their bid and reclaim funds

**Parameters**:
- `bid_id`: ID of the bid to cancel

**Validation Logic**:
- Only the original bidder can cancel
- Bid must be active

**Action Flow**:
1. Verifies caller is the original bidder
2. Transfers funds from escrow back to bidder
3. Marks bid as inactive

**Storage Effects**:
- Updates `VoucherBid.active` to false
- Moves tokens from escrow back to bidder's account

### 8. `mark_bid_for_refund`

**Purpose**: Flags bids for refund when an NFT has been sold through other means

**Parameters**:
- `bid_ids`: Single or multiple bid IDs to mark for refund

**Validation Logic**:
- Only exchange authority can mark bids for refund
- Bids must be for an NFT that's been sold

**Action Flow**:
1. Verifies caller is exchange authority
2. Checks if NFT has been sold
3. Marks specified bids as requiring refund

**Storage Effects**:
- Updates `VoucherBid.requires_refund` to true for affected bids

### 9. `refund_bid`

**Purpose**: Processes the actual refund for a previously marked bid

**Parameters**:
- `bid_id`: ID of the bid to refund

**Validation Logic**:
- Bid must be flagged as requiring refund
- Bid must be active

**Action Flow**:
1. Transfers funds from escrow back to original bidder
2. Marks bid as inactive and no longer requiring refund

**Storage Effects**:
- Updates `VoucherBid.active` to false
- Updates `VoucherBid.requires_refund` to false
- Moves tokens from escrow back to bidder's account

## System Interaction Flows

### Listing and Direct Purchase Flow
1. Seller creates listing (`create_voucher_listing`)
2. Buyer purchases directly (`fulfill_voucher_listing`)
3. NFT transfers to buyer, payment to seller with fee to exchange

### Bidding and Acceptance Flow
1. Seller creates listing (`create_voucher_listing`)
2. Buyer places bid (`create_voucher_bid`)
3. Seller accepts bid (`accept_voucher_bid`)
4. NFT transfers to bidder, escrowed payment to seller with fee to exchange

### Cancellation Flows
1. **Listing Cancellation**:
    - Seller creates listing (`create_voucher_listing`)
    - Seller cancels listing (`cancel_voucher_listing`)

2. **Bid Cancellation**:
    - Buyer places bid (`create_voucher_bid`)
    - Buyer cancels bid (`cancel_voucher_bid`)
    - Funds return to buyer from escrow

3. **Refund Process**:
    - Multiple bids exist for an NFT
    - NFT is sold through one bid or direct purchase
    - Exchange authority marks other bids for refund (`mark_bid_for_refund`)
    - Bidders or admin calls refund for each bid (`refund_bid`)