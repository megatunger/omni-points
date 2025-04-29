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
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    createAssociatedTokenAccount,
    mintTo,
    getAccount,
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

    // Listing and bid parameters
    const listingPrice = new BN(500_000_000);
    const bidPrice = new BN(400_000_000);
    let listingPDA: PublicKey;
    let listingBump: number;
    let bidPDA: PublicKey;
    let bidBump: number;
    let escrowPDA: PublicKey;
    let escrowBump: number;
    let nftStatePDA: PublicKey;
    let nftStateBump: number;

    // Fee settings
    const feeBasisPoints = 250; // 2.5%

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

        [listingPDA, listingBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_listing"),
                exchangePDA.toBuffer(),
                nftOwner.publicKey.toBuffer(),
                nftMint.toBuffer(),
            ],
            program.programId
        );

        [bidPDA, bidBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_bid"),
                exchangePDA.toBuffer(),
                bidder.publicKey.toBuffer(),
                nftMint.toBuffer(),
            ],
            program.programId
        );

        [escrowPDA, escrowBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                exchangePDA.toBuffer(),
                bidder.publicKey.toBuffer(),
                nftMint.toBuffer(),
            ],
            program.programId
        );

        [nftStatePDA, nftStateBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_state"),
                exchangePDA.toBuffer(),
                nftMint.toBuffer(),
            ],
            program.programId
        );
    });

    it("Initialize Exchange", async () => {
        // Initialize the voucher exchange
        const tx = await program.methods
            .initializeExchange(feeBasisPoints)
            .accounts({
                exchange: exchangePDA,
                authority: admin.publicKey,
                feeAccount: adminPaymentAccount,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([admin])
            .rpc();

        console.log("Initialize transaction:", tx);

        // Verify exchange was initialized correctly
        const exchangeAccount = await program.account.voucherExchange.fetch(exchangePDA);
        assert.equal(exchangeAccount.authority.toString(), admin.publicKey.toString());
        assert.equal(exchangeAccount.feeBasisPoints, feeBasisPoints);
        assert.equal(exchangeAccount.feeAccount.toString(), adminPaymentAccount.toString());
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
                nftAccount: nftOwnerAccount,
                paymentMint: paymentMint,
                tokenProgram: TOKEN_PROGRAM_ID,
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
        assert.equal(listingAccount.nftAccount.toString(), nftOwnerAccount.toString());
        assert.equal(listingAccount.price.toString(), listingPrice.toString());
        assert.equal(listingAccount.paymentMint.toString(), paymentMint.toString());
        assert.equal(listingAccount.active, true);
        assert.equal(listingAccount.exchange.toString(), exchangePDA.toString());

        // Verify exchange counter was incremented
        const exchangeAccount = await program.account.voucherExchange.fetch(exchangePDA);
        assert.equal(exchangeAccount.totalListings.toNumber(), 1);
    });

    it("Create Voucher Bid", async () => {
        // Create a bid on the voucher
        const tx = await program.methods
            .createVoucherBid(bidPrice, escrowBump)
            .accounts({
                bid: bidPDA,
                exchange: exchangePDA,
                bidder: bidder.publicKey,
                nftMint: nftMint,
                nftState: null, // Optional, may not exist yet
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                escrowAccount: escrowPDA,
                tokenProgram: TOKEN_PROGRAM_ID,
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
        assert.equal(bidAccount.escrowAccount.toString(), escrowPDA.toString());
        assert.equal(bidAccount.active, true);
        assert.equal(bidAccount.requiresRefund, false);
        assert.equal(bidAccount.exchange.toString(), exchangePDA.toString());

        // Verify funds were moved to escrow
        const escrowInfo = await getAccount(provider.connection, escrowPDA);
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
                exchange: exchangePDA,
                owner: nftOwner.publicKey,
                bidder: bidder.publicKey,
                nftMint: nftMint,
                nftState: nftStatePDA,
                ownerNftAccount: nftOwnerAccount,
                bidderNftAccount: bidderNftAccount,
                paymentMint: paymentMint,
                escrowAccount: escrowPDA,
                ownerPaymentAccount: nftOwnerPaymentAccount,
                feeAccount: adminPaymentAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .signers([nftOwner])
            .rpc();

        console.log("Accept bid transaction:", tx);

        // Calculate expected fee and seller amount
        const feeAmount = bidPrice.mul(new BN(feeBasisPoints)).div(new BN(10000));
        const sellerAmount = bidPrice.sub(feeAmount);

        // Verify NFT was transferred to bidder
        const bidderNftAccountInfo = await getAccount(provider.connection, bidderNftAccount);
        assert.equal(bidderNftAccountInfo.amount.toString(), "1");

        // Verify payment was transferred to seller
        const ownerPaymentAccountInfo = await getAccount(provider.connection, nftOwnerPaymentAccount);
        assert.equal(ownerPaymentAccountInfo.amount.toString(), sellerAmount.toString());

        // Verify fee was transferred to admin
        const adminPaymentAccountInfo = await getAccount(provider.connection, adminPaymentAccount);
        assert.equal(adminPaymentAccountInfo.amount.toString(), feeAmount.toString());

        // Verify bid is no longer active
        const bidAccount = await program.account.voucherBid.fetch(bidPDA);
        assert.equal(bidAccount.active, false);

        // Verify NFT state was updated
        const nftStateAccount = await program.account.voucherState.fetch(nftStatePDA);
        assert.equal(nftStateAccount.nftMint.toString(), nftMint.toString());
        assert.equal(nftStateAccount.sold, true);
        assert.equal(nftStateAccount.exchange.toString(), exchangePDA.toString());
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
                exchangePDA.toBuffer(),
                nftMint2.toBuffer(),
            ],
            program.programId
        );

        // Create a new listing with a different NFT
        const listingPrice2 = new BN(600_000_000);

        const [listingPDA2] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_listing"),
                exchangePDA.toBuffer(),
                nftOwner.publicKey.toBuffer(),
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
                nftAccount: nftOwnerAccount2,
                paymentMint: paymentMint,
                tokenProgram: TOKEN_PROGRAM_ID,
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
                exchange: exchangePDA,
                buyer: buyer.publicKey,
                owner: nftOwner.publicKey,
                nftMint: nftMint2,
                nftState: nftStatePDA2,
                nftAccount: nftOwnerAccount2,
                buyerNftAccount: buyerNftAccount2,
                paymentMint: paymentMint,
                buyerPaymentAccount: buyerPaymentAccount,
                ownerPaymentAccount: nftOwnerPaymentAccount,
                feeAccount: adminPaymentAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .signers([buyer])
            .rpc();

        console.log("Fulfill listing transaction:", fulfillTx);

        // Calculate expected fee and seller amount for this transaction
        const feeAmount2 = listingPrice2.mul(new BN(feeBasisPoints)).div(new BN(10000));
        const sellerAmount2 = listingPrice2.sub(feeAmount2);

        // Calculate the previous bid fee and seller amount
        const previousBidFeeAmount = bidPrice.mul(new BN(feeBasisPoints)).div(new BN(10000));
        const previousSellerAmount = bidPrice.sub(previousBidFeeAmount);

        // Verify NFT was transferred to buyer
        const buyerNftAccountInfo = await getAccount(provider.connection, buyerNftAccount2);
        assert.equal(buyerNftAccountInfo.amount.toString(), "1");

        // Verify payment was transferred (add the previous seller amount)
        const expectedTotalPayment = previousSellerAmount.add(sellerAmount2);
        const ownerPaymentAccountInfo = await getAccount(provider.connection, nftOwnerPaymentAccount);
        assert.equal(ownerPaymentAccountInfo.amount.toString(), expectedTotalPayment.toString());

        // Verify fee was transferred (add the previous fee amount)
        const expectedTotalFee = previousBidFeeAmount.add(feeAmount2);
        const adminPaymentAccountInfo = await getAccount(provider.connection, adminPaymentAccount);
        assert.equal(adminPaymentAccountInfo.amount.toString(), expectedTotalFee.toString());

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
                exchangePDA.toBuffer(),
                nftOwner.publicKey.toBuffer(),
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
                nftAccount: nftOwnerAccount3,
                paymentMint: paymentMint,
                tokenProgram: TOKEN_PROGRAM_ID,
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
                exchange: exchangePDA,
                owner: nftOwner.publicKey,
                nftMint: nftMint3,
                systemProgram: SystemProgram.programId,
            })
            .signers([nftOwner])
            .rpc();

        console.log("Cancel listing transaction:", cancelTx);

        // Verify listing is no longer active
        const listingAccount = await program.account.voucherListing.fetch(listingPDA3);
        assert.equal(listingAccount.active, false);
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

        const [bidPDA2, bidBump2] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_bid"),
                exchangePDA.toBuffer(),
                bidder.publicKey.toBuffer(),
                nftMint4.toBuffer(),
            ],
            program.programId
        );

        const [escrowPDA2, escrowBump2] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                exchangePDA.toBuffer(),
                bidder.publicKey.toBuffer(),
                nftMint4.toBuffer(),
            ],
            program.programId
        );

        // Create the bid
        const createBidTx = await program.methods
            .createVoucherBid(bidPrice2, escrowBump2)
            .accounts({
                bid: bidPDA2,
                exchange: exchangePDA,
                bidder: bidder.publicKey,
                nftMint: nftMint4,
                nftState: null, // Use null since this NFT hasn't been sold yet
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                escrowAccount: escrowPDA2,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([bidder])
            .rpc();

        console.log("Create bid to cancel transaction:", createBidTx);

        // Verify the funds were moved to escrow
        const escrowInfoBefore = await getAccount(provider.connection, escrowPDA2);
        assert.equal(escrowInfoBefore.amount.toString(), bidPrice2.toString());

        // Get bidder token balance before cancel
        const bidderAccountBefore = await getAccount(provider.connection, bidderPaymentAccount);

        // Cancel the bid
        const cancelBidTx = await program.methods
            .cancelVoucherBid()
            .accounts({
                bid: bidPDA2,
                exchange: exchangePDA,
                bidder: bidder.publicKey,
                nftMint: nftMint4,
                escrowAccount: escrowPDA2,
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
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
                exchangePDA.toBuffer(),
                nftMint5.toBuffer(),
            ],
            program.programId
        );

        // First create a listing for this NFT
        const listingPrice5 = new BN(500_000_000);

        const [listingPDA5] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_listing"),
                exchangePDA.toBuffer(),
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
                nftAccount: nftOwnerAccount5,
                paymentMint: paymentMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([nftOwner])
            .rpc();

        // Create another bid for refund testing
        const bidPrice3 = new BN(350_000_000);

        const [bidPDA3, bidBump3] = await PublicKey.findProgramAddress(
            [
                Buffer.from("voucher_bid"),
                exchangePDA.toBuffer(),
                bidder.publicKey.toBuffer(),
                nftMint5.toBuffer(),
            ],
            program.programId
        );

        const [escrowPDA3, escrowBump3] = await PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                exchangePDA.toBuffer(),
                bidder.publicKey.toBuffer(),
                nftMint5.toBuffer(),
            ],
            program.programId
        );

        // Create the bid
        const createBidTx = await program.methods
            .createVoucherBid(bidPrice3, escrowBump3)
            .accounts({
                bid: bidPDA3,
                exchange: exchangePDA,
                bidder: bidder.publicKey,
                nftMint: nftMint5,
                nftState: null, // Use null since this NFT hasn't been sold yet
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                escrowAccount: escrowPDA3,
                tokenProgram: TOKEN_PROGRAM_ID,
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
                exchange: exchangePDA,
                buyer: buyer.publicKey,
                owner: nftOwner.publicKey,
                nftMint: nftMint5,
                nftState: nftStatePDA5,
                nftAccount: nftOwnerAccount5,
                buyerNftAccount: buyerNftAccount5,  // This must be a token account owned by buyer
                paymentMint: paymentMint,
                buyerPaymentAccount: buyerPaymentAccount,
                ownerPaymentAccount: nftOwnerPaymentAccount,
                feeAccount: adminPaymentAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
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
                exchange: exchangePDA,
                authority: admin.publicKey,
                nftState: nftStatePDA5,
                nftMint: nftMint5,
                bidder: bidder.publicKey, // Added bidder account for PDA derivation
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
                exchange: exchangePDA,
                bidder: bidder.publicKey, // The bidder needs to sign for the refund now
                nftMint: nftMint5, // Added nftMint for PDA derivation
                escrowAccount: escrowPDA3,
                paymentMint: paymentMint,
                bidderTokenAccount: bidderPaymentAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([bidder]) // Bidder needs to sign, not admin
            .rpc();

        console.log("Refund bid transaction:", refundBidTx);

        // Verify bid is no longer active and no longer requires refund
        const bidAccountAfter = await program.account.voucherBid.fetch(bidPDA3);
        assert.equal(bidAccountAfter.active, false);
        assert.equal(bidAccountAfter.requiresRefund, false);
    });
});