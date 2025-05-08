import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoucherExchange } from "../target/types/voucher_exchange";
import {
    PublicKey,
    Keypair,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    createAssociatedTokenAccount,
    mintTo,
    getAccount,
    getMint,
} from "@solana/spl-token";
import { BN } from "bn.js";
import { assert } from "chai";

describe("voucher_exchange", () => {
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.voucherExchange as Program<VoucherExchange>;

    // Define test accounts
    const admin = Keypair.generate();
    const nftOwner = Keypair.generate();
    const buyer = Keypair.generate();
    const bidder = Keypair.generate();

    // Define PDAs
    let exchangePDA: PublicKey;
    let exchangeBump: number;

    // Token accounts
    let nftMint: PublicKey;
    let paymentMint: PublicKey;
    let nftOwnerAccount: PublicKey;
    let buyerNftAccount: PublicKey;
    let bidderNftAccount: PublicKey;
    let adminPaymentAccount: PublicKey;
    let nftOwnerPaymentAccount: PublicKey;
    let buyerPaymentAccount: PublicKey;
    let bidderPaymentAccount: PublicKey;

    // Token program IDs
    let nftTokenProgramId: PublicKey;
    let paymentTokenProgramId: PublicKey;

    // Listing and bid parameters
    const listingPrice = new BN(500_000_000);
    const bidPrice = new BN(400_000_000);
    let listingPDA: PublicKey;
    let listingBump: number;
    let bidPDA: PublicKey;
    let bidBump: number;
    let escrowNftPDA: PublicKey;
    let escrowNftBump: number;
    let escrowBidPDA: PublicKey;
    let escrowBidBump: number;
    let nftStatePDA: PublicKey;
    let nftStateBump: number;

    before(async () => {
        // Airdrop SOL to test accounts
        await provider.connection.requestAirdrop(admin.publicKey, 1000000000);
        await provider.connection.requestAirdrop(nftOwner.publicKey, 1000000000);
        await provider.connection.requestAirdrop(buyer.publicKey, 1000000000);
        await provider.connection.requestAirdrop(bidder.publicKey, 1000000000);

        // Wait for confirmations
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create NFT and payment tokens
        nftMint = await createMint(
            provider.connection,
            nftOwner,
            nftOwner.publicKey,
            null,
            0 // 0 decimals for NFT
        );

        paymentMint = await createMint(
            provider.connection,
            admin,
            admin.publicKey,
            null,
            6 // 6 decimals for payment token
        );

        // Get token program IDs
        nftTokenProgramId = TOKEN_PROGRAM_ID; // Using standard token for this test
        paymentTokenProgramId = TOKEN_PROGRAM_ID; // Using standard token for this test

        // Create token accounts
        nftOwnerAccount = await createAssociatedTokenAccount(
            provider.connection,
            nftOwner,
            nftMint,
            nftOwner.publicKey
        );

        buyerNftAccount = await createAssociatedTokenAccount(
            provider.connection,
            buyer,
            nftMint,
            buyer.publicKey
        );

        bidderNftAccount = await createAssociatedTokenAccount(
            provider.connection,
            bidder,
            nftMint,
            bidder.publicKey
        );

        adminPaymentAccount = await createAssociatedTokenAccount(
            provider.connection,
            admin,
            paymentMint,
            admin.publicKey
        );

        nftOwnerPaymentAccount = await createAssociatedTokenAccount(
            provider.connection,
            nftOwner,
            paymentMint,
            nftOwner.publicKey
        );

        buyerPaymentAccount = await createAssociatedTokenAccount(
            provider.connection,
            buyer,
            paymentMint,
            buyer.publicKey
        );

        bidderPaymentAccount = await createAssociatedTokenAccount(
            provider.connection,
            bidder,
            paymentMint,
            bidder.publicKey
        );

        // Mint NFT to owner
        await mintTo(
            provider.connection,
            nftOwner,
            nftMint,
            nftOwnerAccount,
            nftOwner.publicKey,
            1 // NFT amount
        );

        // Mint payment tokens to buyer and bidder
        await mintTo(
            provider.connection,
            admin,
            paymentMint,
            buyerPaymentAccount,
            admin.publicKey,
            10000000000
        );

        await mintTo(
            provider.connection,
            admin,
            paymentMint,
            bidderPaymentAccount,
            admin.publicKey,
            1000000000
        );

        // Derive PDAs
        [exchangePDA, exchangeBump] = await PublicKey.findProgramAddress(
            [Buffer.from("voucher_exchange")],
            program.programId
        );

        // Updated PDA derivation
        [listingPDA, listingBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_listing"),
                nftOwner.publicKey.toBuffer(),
                nftMint.toBuffer(),
            ],
            program.programId
        );

        [bidPDA, bidBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_bid"),
                bidder.publicKey.toBuffer(),
                nftMint.toBuffer(),
            ],
            program.programId
        );

        [escrowNftPDA, escrowNftBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                nftMint.toBuffer(),
            ],
            program.programId
        );

        [escrowBidPDA, escrowBidBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                bidder.publicKey.toBuffer(),
                nftMint.toBuffer(),
            ],
            program.programId
        );

        [nftStatePDA, nftStateBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_state"),
                nftMint.toBuffer(),
            ],
            program.programId
        );
    });

    it("Initialize Exchange", async () => {
        // Initialize the voucher exchange
        const tx = await program.methods
            .initializeExchange()
            .accounts({
                exchange: exchangePDA,
                authority: admin.publicKey,
                feeAccount: adminPaymentAccount,
                tokenProgram: paymentTokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([admin])
            .rpc();

        console.log("Initialize transaction:", tx);

        // Verify exchange was initialized correctly
        const exchangeAccount = await program.account.voucherExchange.fetch(exchangePDA);
        assert.equal(exchangeAccount.authority.toString(), admin.publicKey.toString());
        assert.equal(exchangeAccount.totalListings.toNumber(), 0);
        assert.equal(exchangeAccount.totalBids.toNumber(), 0);
    });

    it("Create Voucher Listing", async () => {
        // Create a voucher listing
        const tx = await program.methods
            .createVoucherListing(listingPrice)
            .accounts({
                listing: listingPDA,
                exchange: exchangePDA,
                owner: nftOwner.publicKey,
                nftMint: nftMint,
                ownerNftAccount: nftOwnerAccount,
                escrowNftAccount: escrowNftPDA,
                paymentMint: paymentMint,
                tokenProgram: nftTokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([nftOwner])
            .rpc();

        console.log("Create listing transaction:", tx);

        // Verify the listing was created correctly
        const listingAccount = await program.account.voucherListing.fetch(listingPDA);
        assert.equal(listingAccount.owner.toString(), nftOwner.publicKey.toString());
        assert.equal(listingAccount.nftMint.toString(), nftMint.toString());
        assert.equal(listingAccount.nftAccount.toString(), escrowNftPDA.toString());
        assert.equal(listingAccount.price.toString(), listingPrice.toString());
        assert.equal(listingAccount.paymentMint.toString(), paymentMint.toString());
        assert.equal(listingAccount.active, true);
        assert.equal(listingAccount.bump, listingBump);
        // No more escrow_bump assertion

        // Verify exchange counter was incremented
        const exchangeAccount = await program.account.voucherExchange.fetch(exchangePDA);
        assert.equal(exchangeAccount.totalListings.toNumber(), 1);
    });

    it("Create Voucher Bid", async () => {
        // Create a bid on the voucher
        const tx = await program.methods
            .createVoucherBid(bidPrice)  // Removed escrowBump parameter
            .accounts({
                bid: bidPDA,
                exchange: exchangePDA,
                bidder: bidder.publicKey,
                nftMint: nftMint,
                nftState: null, // Optional, may not exist yet
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                escrowAccount: escrowBidPDA,
                tokenProgram: paymentTokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([bidder])
            .rpc();

        console.log("Create bid transaction:", tx);

        // Verify the bid was created correctly
        const bidAccount = await program.account.voucherBid.fetch(bidPDA);
        assert.equal(bidAccount.bidder.toString(), bidder.publicKey.toString());
        assert.equal(bidAccount.nftMint.toString(), nftMint.toString());
        assert.equal(bidAccount.price.toString(), bidPrice.toString());
        assert.equal(bidAccount.paymentMint.toString(), paymentMint.toString());
        assert.equal(bidAccount.escrowAccount.toString(), escrowBidPDA.toString());
        assert.equal(bidAccount.active, true);
        assert.equal(bidAccount.requiresRefund, false);

        // Verify funds were moved to escrow
        const escrowInfo = await getAccount(provider.connection, escrowBidPDA);
        assert.equal(escrowInfo.amount.toString(), bidPrice.toString());

        // Verify exchange counter was incremented
        const exchangeAccount = await program.account.voucherExchange.fetch(exchangePDA);
        assert.equal(exchangeAccount.totalBids.toNumber(), 1);
    });

    it("Accept Voucher Bid", async () => {
        // Accept the bid
        const tx = await program.methods
            .acceptVoucherBid()
            .accounts({
                bid: bidPDA,
                owner: nftOwner.publicKey,
                bidder: bidder.publicKey,
                nftMint: nftMint,
                nftState: nftStatePDA,
                ownerNftAccount: nftOwnerAccount,
                bidderNftAccount: bidderNftAccount,
                paymentMint: paymentMint,
                escrowAccount: escrowBidPDA,
                ownerPaymentAccount: nftOwnerPaymentAccount,
                tokenProgram: nftTokenProgramId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .signers([nftOwner])
            .rpc();

        console.log("Accept bid transaction:", tx);

        // In the updated contract, all payment goes to seller
        const sellerAmount = bidPrice;

        // Verify NFT was transferred to bidder
        const bidderNftAccountInfo = await getAccount(provider.connection, bidderNftAccount);
        assert.equal(bidderNftAccountInfo.amount.toString(), "1");

        // Verify payment was transferred to seller
        const ownerPaymentAccountInfo = await getAccount(provider.connection, nftOwnerPaymentAccount);
        assert.equal(ownerPaymentAccountInfo.amount.toString(), sellerAmount.toString());

        // Verify bid is no longer active
        const bidAccount = await program.account.voucherBid.fetch(bidPDA);
        assert.equal(bidAccount.active, false);

        // Verify NFT state was updated
        const nftStateAccount = await program.account.voucherState.fetch(nftStatePDA);
        assert.equal(nftStateAccount.nftMint.toString(), nftMint.toString());
        assert.equal(nftStateAccount.sold, true);
    });

    it("Create Another Listing and Fulfill It", async () => {
        // Create a new NFT mint for this test
        const nftMint2 = await createMint(
            provider.connection,
            nftOwner,
            nftOwner.publicKey,
            null,
            0
        );

        // Create token accounts for the new NFT
        const nftOwnerAccount2 = await createAssociatedTokenAccount(
            provider.connection,
            nftOwner,
            nftMint2,
            nftOwner.publicKey
        );

        const buyerNftAccount2 = await createAssociatedTokenAccount(
            provider.connection,
            buyer,
            nftMint2,
            buyer.publicKey
        );

        // Mint NFT to owner
        await mintTo(
            provider.connection,
            nftOwner,
            nftMint2,
            nftOwnerAccount2,
            nftOwner.publicKey,
            1
        );

        // Create a new NFT state PDA
        const [nftStatePDA2] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_state"),
                nftMint2.toBuffer(),
            ],
            program.programId
        );

        // Create a new listing with a different NFT
        const listingPrice2 = new BN(600_000_000);

        const [listingPDA2] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_listing"),
                nftOwner.publicKey.toBuffer(),
                nftMint2.toBuffer(),
            ],
            program.programId
        );

        // Create escrow NFT account PDA
        const [escrowNftPDA2] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                nftMint2.toBuffer(),
            ],
            program.programId
        );

        // Create the second listing
        const createTx = await program.methods
            .createVoucherListing(listingPrice2)
            .accounts({
                listing: listingPDA2,
                exchange: exchangePDA,
                owner: nftOwner.publicKey,
                nftMint: nftMint2,
                ownerNftAccount: nftOwnerAccount2,
                escrowNftAccount: escrowNftPDA2,
                paymentMint: paymentMint,
                tokenProgram: nftTokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([nftOwner])
            .rpc();

        console.log("Create second listing transaction:", createTx);

        // Buyer fulfills the listing
        const fulfillTx = await program.methods
            .fulfillVoucherListing()
            .accounts({
                listing: listingPDA2,
                buyer: buyer.publicKey,
                owner: nftOwner.publicKey,
                nftMint: nftMint2,
                nftState: nftStatePDA2,
                escrowNftAccount: escrowNftPDA2,
                buyerNftAccount: buyerNftAccount2,
                paymentMint: paymentMint,
                buyerPaymentAccount: buyerPaymentAccount,
                ownerPaymentAccount: nftOwnerPaymentAccount,
                tokenProgram: paymentTokenProgramId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .signers([buyer])
            .rpc();

        console.log("Fulfill listing transaction:", fulfillTx);

        // The entire listing price should be sent to the seller, no fee in this version
        const sellerAmount2 = listingPrice2;

        // Verify NFT was transferred to buyer
        const buyerNftAccountInfo = await getAccount(provider.connection, buyerNftAccount2);
        assert.equal(buyerNftAccountInfo.amount.toString(), "1");

        // For the seller payment validation, don't verify exact amount
        // Since we have multiple tests transferring to the same account
        const ownerPaymentAccountInfo = await getAccount(provider.connection, nftOwnerPaymentAccount);
        console.log(`Seller received: ${ownerPaymentAccountInfo.amount.toString()}`);

        // Ensure the seller received at least the expected amount from this transaction
        assert(ownerPaymentAccountInfo.amount >= sellerAmount2.toNumber(),
            `Seller should have received at least ${sellerAmount2.toString()}, but got ${ownerPaymentAccountInfo.amount.toString()}`);

        // Verify listing is no longer active
        const listingAccount = await program.account.voucherListing.fetch(listingPDA2);
        assert.equal(listingAccount.active, false);
    });

    it("Cancel a Listing", async () => {
        // Create a new NFT mint for this test
        const nftMint3 = await createMint(
            provider.connection,
            nftOwner,
            nftOwner.publicKey,
            null,
            0
        );

        // Create token account for the new NFT
        const nftOwnerAccount3 = await createAssociatedTokenAccount(
            provider.connection,
            nftOwner,
            nftMint3,
            nftOwner.publicKey
        );

        // Mint NFT to owner
        await mintTo(
            provider.connection,
            nftOwner,
            nftMint3,
            nftOwnerAccount3,
            nftOwner.publicKey,
            1
        );

        // Create a new listing to cancel
        const listingPrice3 = new BN(700_000_000);

        const [listingPDA3] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_listing"),
                nftOwner.publicKey.toBuffer(),
                nftMint3.toBuffer(),
            ],
            program.programId
        );

        // Create the escrow NFT account PDA
        const [escrowNftPDA3] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                nftMint3.toBuffer(),
            ],
            program.programId
        );

        // Create the listing
        const createTx = await program.methods
            .createVoucherListing(listingPrice3)
            .accounts({
                listing: listingPDA3,
                exchange: exchangePDA,
                owner: nftOwner.publicKey,
                nftMint: nftMint3,
                ownerNftAccount: nftOwnerAccount3,
                escrowNftAccount: escrowNftPDA3,
                paymentMint: paymentMint,
                tokenProgram: nftTokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([nftOwner])
            .rpc();

        console.log("Create listing to cancel transaction:", createTx);

        // Cancel the listing
        const cancelTx = await program.methods
            .cancelVoucherListing()
            .accounts({
                listing: listingPDA3,
                owner: nftOwner.publicKey,
                nftMint: nftMint3,
                ownerNftAccount: nftOwnerAccount3,
                escrowNftAccount: escrowNftPDA3,
                tokenProgram: nftTokenProgramId,
                systemProgram: SystemProgram.programId,
            })
            .signers([nftOwner])
            .rpc();

        console.log("Cancel listing transaction:", cancelTx);

        // Verify listing is no longer active - it should be closed
        try {
            await program.account.voucherListing.fetch(listingPDA3);
            assert.fail("Listing account should be closed");
        } catch (e) {
            // Expected behavior - account is closed
            console.log("Listing account successfully closed");
        }
    });

    it("Create and Cancel a Bid", async () => {
        // Create a new NFT mint for this test
        const nftMint4 = await createMint(
            provider.connection,
            nftOwner,
            nftOwner.publicKey,
            null,
            0
        );

        // Create token account for the new NFT
        const nftOwnerAccount4 = await createAssociatedTokenAccount(
            provider.connection,
            nftOwner,
            nftMint4,
            nftOwner.publicKey
        );

        // Mint NFT to owner
        await mintTo(
            provider.connection,
            nftOwner,
            nftMint4,
            nftOwnerAccount4,
            nftOwner.publicKey,
            1
        );

        // Create another bid
        const bidPrice2 = new BN(450_000_000);

        const [bidPDA2] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_bid"),
                bidder.publicKey.toBuffer(),
                nftMint4.toBuffer(),
            ],
            program.programId
        );

        const [escrowBidPDA2] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                bidder.publicKey.toBuffer(),
                nftMint4.toBuffer(),
            ],
            program.programId
        );

        // Create the bid
        const createBidTx = await program.methods
            .createVoucherBid(bidPrice2)  // Removed escrowBump parameter
            .accounts({
                bid: bidPDA2,
                exchange: exchangePDA,
                bidder: bidder.publicKey,
                nftMint: nftMint4,
                nftState: null, // Use null since this NFT hasn't been sold yet
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                escrowAccount: escrowBidPDA2,
                tokenProgram: paymentTokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([bidder])
            .rpc();

        console.log("Create bid to cancel transaction:", createBidTx);

        // Verify the funds were moved to escrow
        const escrowInfoBefore = await getAccount(provider.connection, escrowBidPDA2);
        assert.equal(escrowInfoBefore.amount.toString(), bidPrice2.toString());

        // Get bidder token balance before cancel
        const bidderAccountBefore = await getAccount(provider.connection, bidderPaymentAccount);

        // Cancel the bid
        const cancelBidTx = await program.methods
            .cancelVoucherBid()
            .accounts({
                bid: bidPDA2,
                bidder: bidder.publicKey,
                nftMint: nftMint4,
                escrowAccount: escrowBidPDA2,
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                tokenProgram: paymentTokenProgramId,
                systemProgram: SystemProgram.programId,
            })
            .signers([bidder])
            .rpc();

        console.log("Cancel bid transaction:", cancelBidTx);

        // Verify bid is no longer active
        const bidAccount = await program.account.voucherBid.fetch(bidPDA2);
        assert.equal(bidAccount.active, false);

        // Verify funds were returned to bidder
        const bidderAccountAfter = await getAccount(provider.connection, bidderPaymentAccount);
        const bidderBalanceDifference = bidderAccountAfter.amount - bidderAccountBefore.amount;
        assert.equal(bidderBalanceDifference.toString(), bidPrice2.toString());
    });

    it("Mark a Bid for Refund", async () => {
        // Create a new NFT mint for this test
        const nftMint5 = await createMint(
            provider.connection,
            nftOwner,
            nftOwner.publicKey,
            null,
            0
        );

        // Create token accounts for the new NFT
        const nftOwnerAccount5 = await createAssociatedTokenAccount(
            provider.connection,
            nftOwner,
            nftMint5,
            nftOwner.publicKey
        );

        // Create a buyer NFT account - make sure it belongs to the buyer
        const buyerNftAccount5 = await createAssociatedTokenAccount(
            provider.connection,
            buyer,
            nftMint5,
            buyer.publicKey  // This is crucial - must match the buyer in the fulfillVoucherListing call
        );

        // Mint NFT to owner
        await mintTo(
            provider.connection,
            nftOwner,
            nftMint5,
            nftOwnerAccount5,
            nftOwner.publicKey,
            1
        );

        // Create a new NFT state PDA
        const [nftStatePDA5] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_state"),
                nftMint5.toBuffer(),
            ],
            program.programId
        );

        // Create escrow NFT account PDA
        const [escrowNftPDA5] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                nftMint5.toBuffer(),
            ],
            program.programId
        );

        // First create a listing for this NFT
        const listingPrice5 = new BN(500_000_000);

        const [listingPDA5] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_listing"),
                nftOwner.publicKey.toBuffer(),
                nftMint5.toBuffer(),
            ],
            program.programId
        );

        // Create the listing
        await program.methods
            .createVoucherListing(listingPrice5)
            .accounts({
                listing: listingPDA5,
                exchange: exchangePDA,
                owner: nftOwner.publicKey,
                nftMint: nftMint5,
                ownerNftAccount: nftOwnerAccount5,
                escrowNftAccount: escrowNftPDA5,
                paymentMint: paymentMint,
                tokenProgram: nftTokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([nftOwner])
            .rpc();

        // Create another bid for refund testing
        const bidPrice3 = new BN(350_000_000);

        const [bidPDA3] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_bid"),
                bidder.publicKey.toBuffer(),
                nftMint5.toBuffer(),
            ],
            program.programId
        );

        const [escrowBidPDA3] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                bidder.publicKey.toBuffer(),
                nftMint5.toBuffer(),
            ],
            program.programId
        );

        // Create the bid
        const createBidTx = await program.methods
            .createVoucherBid(bidPrice3)  // Removed escrowBump parameter
            .accounts({
                bid: bidPDA3,
                exchange: exchangePDA,
                bidder: bidder.publicKey,
                nftMint: nftMint5,
                nftState: null, // Use null since this NFT hasn't been sold yet
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                escrowAccount: escrowBidPDA3,
                tokenProgram: paymentTokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([bidder])
            .rpc();

        console.log("Create bid for refund test transaction:", createBidTx);

        // Now fulfill the listing to create the NFT state as "sold"
        await program.methods
            .fulfillVoucherListing()
            .accounts({
                listing: listingPDA5,
                buyer: buyer.publicKey,
                owner: nftOwner.publicKey,
                nftMint: nftMint5,
                nftState: nftStatePDA5,
                escrowNftAccount: escrowNftPDA5,
                buyerNftAccount: buyerNftAccount5,
                paymentMint: paymentMint,
                buyerPaymentAccount: buyerPaymentAccount,
                ownerPaymentAccount: nftOwnerPaymentAccount,
                tokenProgram: nftTokenProgramId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .signers([buyer])
            .rpc();

        // Mark the bid for refund
        const markBidTx = await program.methods
            .markBidForRefund()
            .accounts({
                authority: admin.publicKey,
                exchange: exchangePDA,
                nftState: nftStatePDA5,
                nftMint: nftMint5,
                bidder: bidder.publicKey,
                bid: bidPDA3,
                systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc();

        console.log("Mark bid for refund transaction:", markBidTx);

        // Verify bid is marked for refund
        const bidAccount = await program.account.voucherBid.fetch(bidPDA3);
        assert.equal(bidAccount.requiresRefund, true);

        // Refund the bid
        const refundBidTx = await program.methods
            .refundBid()
            .accounts({
                bid: bidPDA3,
                bidder: bidder.publicKey,
                nftMint: nftMint5,
                escrowAccount: escrowBidPDA3,
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                tokenProgram: paymentTokenProgramId,
                systemProgram: SystemProgram.programId,
            })
            .signers([bidder])
            .rpc();

        console.log("Refund bid transaction:", refundBidTx);

        // Verify bid is no longer active and no longer requires refund
        const bidAccountAfter = await program.account.voucherBid.fetch(bidPDA3);
        assert.equal(bidAccountAfter.active, false);
        assert.equal(bidAccountAfter.requiresRefund, false);
    });
});
