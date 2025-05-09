"use client";

import {
  getVoucherExchangeProgram,
  VOUCHER_EXCHANGE_PROGRAM_ID,
} from "@project/voucher-exchange";
import {
  getExchangePDA,
  getListingPDA,
  getBidPDA,
  getEscrowNftPDA,
  getEscrowBidPDA,
} from "./pda";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  MintLayout,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import BN from "bn.js";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/use-cluster-provider";
import { useAnchorProvider } from "../solana/use-solana-provider";
import bs58 from "bs58";
import { connection } from "@/utils/constants";

// Types and Interfaces
export interface VoucherExchange {
  authority: PublicKey;
  totalListings: BN;
  totalBids: BN;
  bump: number;
}

export interface VoucherListing {
  owner: PublicKey;
  nftMint: PublicKey;
  nftAccount: PublicKey;
  price: BN;
  paymentMint: PublicKey;
  active: boolean;
  bump: number;
  // Removed escrow_bump field
}

export interface VoucherBid {
  bidder: PublicKey;
  nftMint: PublicKey;
  price: BN;
  paymentMint: PublicKey;
  escrowAccount: PublicKey;
  active: boolean;
  requiresRefund: boolean;
  bump: number;
  escrowBump: number;
}

export interface VoucherState {
  nftMint: PublicKey;
  sold: boolean;
  latestSaleTimestamp: BN;
  bump: number;
}

// Transaction error codes that might be encountered
export enum TransactionErrorCode {
  InsufficientFunds = 0x100, // Example code
  InvalidOwner = 0x101, // Example code
  // Add other codes as needed
}

// Default query options
const DEFAULT_QUERY_OPTIONS = {
  staleTime: 60000, // 1 minute
  cacheTime: 300000, // 5 minutes
  refetchOnWindowFocus: false,
  retry: 2,
};

export function useVoucherExchange() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const provider = useAnchorProvider();
  const program = getVoucherExchangeProgram(provider);

  // --- QUERIES ---

  // Core program info
  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(VOUCHER_EXCHANGE_PROGRAM_ID),
    ...DEFAULT_QUERY_OPTIONS,
  });

  // Exchange account
  const getExchangeAccount = useQuery({
    queryKey: ["get-exchange-account", { cluster }],
    queryFn: async () => {
      const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
      return program.account.voucherExchange.fetch(exchangePDA);
    },
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!publicKey,
  });

  // Get Listing by Owner and NFT Mint
  const getListingByOwnerAndMint = (owner: PublicKey, nftMint: PublicKey) => {
    return useQuery({
      queryKey: [
        "get-listing",
        { owner: owner?.toBase58(), nftMint: nftMint?.toBase58(), cluster },
      ],
      queryFn: async () => {
        const [listingPDA] = await getListingPDA(
          owner,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );
        return program.account.voucherListing.fetch(listingPDA);
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!owner && !!nftMint,
    });
  };

  // Get Bid by Bidder and NFT Mint
  const getBidByBidderAndMint = (bidder: PublicKey, nftMint: PublicKey) => {
    return useQuery({
      queryKey: [
        "get-bid",
        { bidder: bidder?.toBase58(), nftMint: nftMint?.toBase58(), cluster },
      ],
      queryFn: async () => {
        const [bidPDA] = await getBidPDA(
          bidder,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );
        return program.account.voucherBid.fetch(bidPDA);
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!bidder && !!nftMint,
    });
  };

  // --- FETCH FUNCTIONS ---

  // Fetch active listings
  const fetchActiveListings = async () => {
    try {
      const listings = await program.account.voucherListing.all([
        {
          memcmp: {
            offset: 8 + 32 + 32 + 32 + 8 + 32, // Skip to active field
            bytes: bs58.encode(Buffer.from([1])),
          },
        },
      ]);

      return listings.map(
        (listing: { publicKey: PublicKey; account: any }) => ({
          address: listing.publicKey,
          data: listing.account as VoucherListing,
        }),
      );
    } catch (error) {
      console.error("Error fetching active listings:", error);
      throw error;
    }
  };

  // Fetch listings by NFT mint
  const fetchListingsByNftMint = async (nftMint: PublicKey) => {
    if (!nftMint) return [];

    try {
      const listings = await program.account.voucherListing.all([
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator and owner
            bytes: nftMint.toBase58(),
          },
        },
      ]);

      return listings.map(
        (listing: { publicKey: PublicKey; account: any }) => ({
          address: listing.publicKey,
          data: listing.account as VoucherListing,
        }),
      );
    } catch (error) {
      console.error("Error fetching listings by NFT mint:", error);
      throw error;
    }
  };

  // Fetch listings by owner
  const fetchListingsByOwner = async (owner: PublicKey) => {
    if (!owner) return [];

    try {
      const listings = await program.account.voucherListing.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: owner.toBase58(),
          },
        },
      ]);

      return listings.map(
        (listing: { publicKey: PublicKey; account: any }) => ({
          address: listing.publicKey,
          data: listing.account as VoucherListing,
        }),
      );
    } catch (error) {
      console.error("Error fetching listings by owner:", error);
      throw error;
    }
  };

  // Fetch active bids
  const fetchActiveBids = async () => {
    try {
      const bids = await program.account.voucherBid.all([
        {
          memcmp: {
            offset: 8 + 32 + 32 + 8 + 32 + 32, // Skip to active field
            bytes: bs58.encode(Buffer.from([1])), // 1 = true
          },
        },
      ]);

      return bids.map((bid: { publicKey: PublicKey; account: any }) => ({
        address: bid.publicKey,
        data: bid.account as VoucherBid,
      }));
    } catch (error) {
      console.error("Error fetching active bids:", error);
      throw error;
    }
  };

  // Fetch bids by NFT mint
  const fetchBidsByNftMint = async (nftMint: PublicKey) => {
    if (!nftMint) return [];

    try {
      const bids = await program.account.voucherBid.all([
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator and bidder
            bytes: nftMint.toBase58(),
          },
        },
      ]);

      return bids.map((bid: { publicKey: PublicKey; account: any }) => ({
        address: bid.publicKey,
        data: bid.account as VoucherBid,
      }));
    } catch (error) {
      console.error("Error fetching bids by NFT mint:", error);
      throw error;
    }
  };

  // Fetch bids by bidder
  const fetchBidsByBidder = async (bidder: PublicKey) => {
    if (!bidder) return [];

    try {
      const bids = await program.account.voucherBid.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: bidder.toBase58(),
          },
        },
      ]);

      return bids.map((bid: { publicKey: PublicKey; account: any }) => ({
        address: bid.publicKey,
        data: bid.account as VoucherBid,
      }));
    } catch (error) {
      console.error("Error fetching bids by bidder:", error);
      throw error;
    }
  };

  // Fetch bids requiring refund
  const fetchBidsRequiringRefund = async () => {
    try {
      const bids = await program.account.voucherBid.all([
        {
          memcmp: {
            offset: 8 + 32 + 32 + 8 + 32 + 32 + 1, // Skip to requiresRefund field
            bytes: bs58.encode(Buffer.from([1])), // 1 = true
          },
        },
      ]);

      return bids.map((bid: { publicKey: PublicKey; account: any }) => ({
        address: bid.publicKey,
        data: bid.account as VoucherBid,
      }));
    } catch (error) {
      console.error("Error fetching bids requiring refund:", error);
      throw error;
    }
  };

  // --- MUTATIONS ---

  // Initialize Exchange Mutation
  const initializeExchange = useMutation({
    mutationKey: ["initialize-exchange", { cluster }],
    mutationFn: async () => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        console.log("Initializing exchange");
        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);

        const tx = await program.methods
          .initializeExchange()
          .accounts({
            exchange: exchangePDA,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .transaction();

        // Send and sign transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signedTx = await wallet.signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
        );
        console.log(`Transaction sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          console.error(
            "Transaction failed after confirmation:",
            confirmation.value.err,
          );
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in initializeExchange:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full initialize exchange error:", error);
      const errorMessage = error.message || "Unknown error";
      toast.error(`Failed to initialize exchange: ${errorMessage}`);
    },
  });

  // Create Voucher Listing Mutation
  const createVoucherListing = useMutation({
    mutationKey: ["create-voucher-listing", { cluster }],
    mutationFn: async ({
      nftMint,
      paymentMint,
      price,
    }: {
      nftMint: PublicKey;
      paymentMint: PublicKey;
      price: BN;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        const [listingPDA] = await getListingPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        // Get escrow NFT account PDA - using the NFT-only variant
        const [escrowNftPDA] = await getEscrowNftPDA(
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        const ownerNftAccount = await getAssociatedTokenAddress(
          nftMint,
          publicKey,
        );

        // Check if the exchange exists
        try {
          await program.account.voucherExchange.fetch(exchangePDA);
        } catch (error) {
          throw new Error(
            "Exchange account not initialized. Please initialize the exchange first.",
          );
        }

        // Check if the user owns the NFT
        try {
          const nftAccountInfo =
            await connection.getAccountInfo(ownerNftAccount);
          if (!nftAccountInfo) {
            throw new Error("NFT account does not exist");
          }
        } catch (error) {
          throw new Error(
            "Failed to verify NFT ownership. Please ensure you own this NFT.",
          );
        }

        // Build the transaction using Anchor program
        const tx = await program.methods
          .createVoucherListing(price)
          .accounts({
            listing: listingPDA,
            exchange: exchangePDA,
            owner: publicKey,
            nftMint: nftMint,
            ownerNftAccount: ownerNftAccount,
            escrowNftAccount: escrowNftPDA,
            paymentMint: paymentMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .transaction();

        // Send and sign transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signedTx = await wallet.signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
        );
        console.log(`Transaction sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          console.error(
            "Transaction failed after confirmation:",
            confirmation.value.err,
          );
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in createVoucherListing:", error);

        // Add context to the error
        if (error.message.includes("0x1")) {
          throw new Error(
            "Insufficient funds for transaction. Please add more SOL to your wallet.",
          );
        } else if (error.message.includes("TokenAccountNotFoundError")) {
          throw new Error(
            "NFT token account not found. Please check if you still own this NFT.",
          );
        } else {
          throw error;
        }
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full listing error:", error);
      const errorMessage = error.message || "Unknown error";
      toast.error(`Failed to create listing: ${errorMessage}`, {
        duration: 7000,
        position: "bottom-right",
      });
    },
  });

  // Create Voucher Bid Mutation
  const createVoucherBid = useMutation({
    mutationKey: ["create-voucher-bid", { cluster }],
    mutationFn: async ({
      nftMint,
      paymentMint,
      price,
    }: {
      nftMint: PublicKey;
      paymentMint: PublicKey;
      price: number;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        const paymentMintInfo = await connection.getAccountInfo(paymentMint);
        const isToken2022 =
          paymentMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ?? true;

        let decimals = 9; // Default to 9 if we can't determine
        try {
          if (paymentMintInfo && paymentMintInfo.data) {
            // Parse mint data to extract decimals
            const mintData = MintLayout.decode(paymentMintInfo.data);
            decimals = mintData.decimals;
          }
        } catch (error) {
          console.error("Error parsing mint data:", error);
        }

        const bidderTokenAccount = await getAssociatedTokenAddress(
          paymentMint,
          publicKey,
          false,
          isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
        );

        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        const [bidPDA] = await getBidPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        const [escrowBidPDA, escrowBump] = await getEscrowBidPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        // Check if exchange exists
        try {
          await program.account.voucherExchange.fetch(exchangePDA);
        } catch (error) {
          throw new Error(
            "Exchange account not initialized. Please initialize the exchange first.",
          );
        }

        // Check if the bidder token account exists
        try {
          const tokenAccountInfo =
            await connection.getAccountInfo(bidderTokenAccount);
          if (!tokenAccountInfo) {
            throw new Error("Token account does not exist");
          }
        } catch (error) {
          throw new Error(
            "Failed to verify payment token account. Please check your wallet has the payment token.",
          );
        }

        const bidPriceBN = new BN(price * 10 ** decimals);
        const tx = await program.methods
          .createVoucherBid(bidPriceBN, escrowBump)
          .accounts({
            bid: bidPDA,
            exchange: exchangePDA,
            bidder: publicKey,
            nftMint: nftMint,
            paymentMint: paymentMint,
            bidderTokenAccount: bidderTokenAccount,
            escrowAccount: escrowBidPDA,
            tokenProgram: isToken2022
              ? TOKEN_2022_PROGRAM_ID
              : TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .transaction();

        // Send and sign transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signedTx = await wallet.signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
        );

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in createVoucherBid:", error);
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full bid error:", error);
    },
  });

  // Update the acceptVoucherBid mutation
  const acceptVoucherBid = useMutation({
    mutationKey: ["accept-voucher-bid", { cluster }],
    mutationFn: async ({
      bidder,
      nftMint,
      paymentMint,
    }: {
      bidder: PublicKey;
      nftMint: PublicKey;
      paymentMint: PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        const paymentMintInfo = await connection.getAccountInfo(paymentMint);
        const isToken2022 =
          paymentMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ?? true;
        // Get all required addresses
        const bidderNftAccount = await getAssociatedTokenAddress(
          nftMint,
          bidder,
          false,
          TOKEN_PROGRAM_ID, // NFTs always use standard token program
        );

        const ownerPaymentAccount = await getAssociatedTokenAddress(
          paymentMint,
          publicKey,
          false,
          isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
        );

        // Get PDAs
        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        const [bidPDA] = await getBidPDA(
          bidder,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );
        const [listingPDA] = await getListingPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        // Get escrow accounts
        const [escrowNftPDA] = await getEscrowNftPDA(
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );
        const [escrowBidPDA] = await getEscrowBidPDA(
          bidder,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        // Verify that the bid exists and is active
        try {
          const bidAccount = await program.account.voucherBid.fetch(bidPDA);
          if (!bidAccount.active) {
            throw new Error("This bid is not active");
          }
        } catch (error) {
          throw new Error(
            "Failed to verify bid. It may no longer be active or valid.",
          );
        }

        // Verify that the listing exists and is active
        try {
          const listingAccount =
            await program.account.voucherListing.fetch(listingPDA);
          if (!listingAccount.active) {
            throw new Error("This listing is not active");
          }
        } catch (error) {
          throw new Error(
            "Failed to verify listing. It may no longer be active or valid.",
          );
        }

        // Check if accounts need to be created
        const accountsToCreate = [];

        // Check if bidder NFT account exists
        const bidderNftAccountInfo =
          await connection.getAccountInfo(bidderNftAccount);
        if (!bidderNftAccountInfo) {
          accountsToCreate.push(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              bidderNftAccount, // associated token account
              bidder, // owner
              nftMint, // mint
              TOKEN_PROGRAM_ID, // NFTs always use standard token program
            ),
          );
        }

        // Check if owner payment account exists
        const ownerPaymentAccountInfo =
          await connection.getAccountInfo(ownerPaymentAccount);
        if (!ownerPaymentAccountInfo) {
          accountsToCreate.push(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              ownerPaymentAccount, // associated token account
              publicKey, // owner
              paymentMint, // mint
              isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
            ),
          );
        }

        // First transaction: Create accounts if needed
        if (accountsToCreate.length > 0) {
          const createTx = new Transaction();
          accountsToCreate.forEach((ix) => createTx.add(ix));

          // Get fresh blockhash for this transaction
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

          createTx.recentBlockhash = blockhash;
          createTx.feePayer = publicKey;

          const signedCreateTx = await wallet.signTransaction(createTx);
          if (!signedCreateTx)
            throw new Error("Failed to sign account creation transaction");

          const createSignature = await connection.sendRawTransaction(
            signedCreateTx.serialize(),
          );

          const createConfirmation = await connection.confirmTransaction(
            {
              blockhash,
              lastValidBlockHeight,
              signature: createSignature,
            },
            "confirmed",
          );

          if (createConfirmation.value.err) {
            throw new Error(
              `Failed to create accounts: ${JSON.stringify(createConfirmation.value.err)}`,
            );
          }
        }

        // Build transaction with updated account structure
        const tx = await program.methods
          .acceptVoucherBid()
          .accounts({
            bid: bidPDA,
            owner: publicKey,
            bidder: bidder,
            nftMint: nftMint,
            escrowNftAccount: escrowNftPDA,
            listing: listingPDA,
            bidderNftAccount: bidderNftAccount,
            paymentMint: paymentMint,
            escrowPaymentAccount: escrowBidPDA,
            ownerPaymentAccount: ownerPaymentAccount,
            exchange: exchangePDA,
            tokenProgram: isToken2022
              ? TOKEN_2022_PROGRAM_ID
              : TOKEN_PROGRAM_ID,
            tokenNftProgram: TOKEN_PROGRAM_ID, // Always using standard Token program for NFTs
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        // Send and sign transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signedTx = await wallet.signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
        );

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in acceptVoucherBid:", error);
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full accept bid error:", error);
    },
  });

  // Fulfill Voucher Listing Mutation
  // Update the fulfillVoucherListing mutation
  const fulfillVoucherListing = useMutation({
    mutationKey: ["fulfill-voucher-listing", { cluster }],
    mutationFn: async ({
      owner,
      nftMint,
      paymentMint,
    }: {
      owner: PublicKey;
      nftMint: PublicKey;
      paymentMint: PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        const paymentMintInfo = await connection.getAccountInfo(paymentMint);
        const isToken2022 =
          paymentMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ?? true;

        // Get all required addresses
        const buyerPaymentAccount = await getAssociatedTokenAddress(
          paymentMint,
          publicKey,
          false,
          isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
        );

        const ownerPaymentAccount = await getAssociatedTokenAddress(
          paymentMint,
          owner,
          false,
          isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
        );

        const buyerNftAccount = await getAssociatedTokenAddress(
          nftMint,
          publicKey,
          false,
          TOKEN_PROGRAM_ID,
        );

        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        const [listingPDA] = await getListingPDA(
          owner,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );
        const [escrowNftPDA] = await getEscrowNftPDA(
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        // Check if accounts need to be created
        const accountsToCreate = [];

        // Check if buyer NFT account exists
        const buyerNftAccountInfo =
          await connection.getAccountInfo(buyerNftAccount);
        if (!buyerNftAccountInfo) {
          accountsToCreate.push(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              buyerNftAccount, // associated token account
              publicKey, // owner
              nftMint, // mint
              TOKEN_PROGRAM_ID, // NFTs always use standard token program
            ),
          );
        }

        // Check if owner payment account exists
        const ownerPaymentAccountInfo =
          await connection.getAccountInfo(ownerPaymentAccount);
        if (!ownerPaymentAccountInfo) {
          accountsToCreate.push(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              ownerPaymentAccount, // associated token account
              owner, // owner
              paymentMint, // mint
              isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
            ),
          );
        }

        // First transaction: Create accounts if needed
        if (accountsToCreate.length > 0) {
          const createTx = new Transaction();
          accountsToCreate.forEach((ix) => createTx.add(ix));

          // Get fresh blockhash for this transaction
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");

          createTx.recentBlockhash = blockhash;
          createTx.feePayer = publicKey;

          const signedCreateTx = await wallet.signTransaction(createTx);
          if (!signedCreateTx)
            throw new Error("Failed to sign account creation transaction");

          const createSignature = await connection.sendRawTransaction(
            signedCreateTx.serialize(),
          );

          const createConfirmation = await connection.confirmTransaction(
            {
              blockhash,
              lastValidBlockHeight,
              signature: createSignature,
            },
            "confirmed",
          );

          if (createConfirmation.value.err) {
            throw new Error(
              `Failed to create accounts: ${JSON.stringify(createConfirmation.value.err)}`,
            );
          }
        }

        // Second transaction: Main fulfill voucher transaction
        const fulfillTx = await program.methods
          .fulfillVoucherListing()
          .accounts({
            listing: listingPDA,
            buyer: publicKey,
            owner: owner,
            nftMint: nftMint,
            escrowNftAccount: escrowNftPDA,
            buyerNftAccount: buyerNftAccount,
            paymentMint: paymentMint,
            buyerPaymentAccount: buyerPaymentAccount,
            ownerPaymentAccount: ownerPaymentAccount,
            exchange: exchangePDA,
            tokenProgram: isToken2022
              ? TOKEN_2022_PROGRAM_ID
              : TOKEN_PROGRAM_ID,
            tokenNftProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        // Get fresh blockhash for this transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");

        fulfillTx.recentBlockhash = blockhash;
        fulfillTx.feePayer = publicKey;

        const signedFulfillTx = await wallet.signTransaction(fulfillTx);
        if (!signedFulfillTx)
          throw new Error("Failed to sign main transaction");

        const signature = await connection.sendRawTransaction(
          signedFulfillTx.serialize(),
        );

        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          throw new Error(
            `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in fulfillVoucherListing:", error);
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full fulfill listing error:", error);
    },
  });

  // Cancel Voucher Listing Mutation
  const cancelVoucherListing = useMutation({
    mutationKey: ["cancel-voucher-listing", { cluster }],
    mutationFn: async ({ nftMint }: { nftMint: PublicKey }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {

        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        const [listingPDA] = await getListingPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        // Get owner NFT account
        const ownerNftAccount = await getAssociatedTokenAddress(
          nftMint,
          publicKey,
        );

        // Get escrow NFT account PDA - using the NFT-only variant
        const [escrowNftPDA] = await getEscrowNftPDA(
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        const tx = await program.methods
          .cancelVoucherListing()
          .accounts({
            listing: listingPDA,
            owner: publicKey,
            nftMint: nftMint,
            ownerNftAccount: ownerNftAccount,
            escrowNftAccount: escrowNftPDA,
            exchange: exchangePDA, // Added exchange to update stats
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        // Send and sign transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signedTx = await wallet.signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
        );
        console.log(`Transaction sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          console.error(
            "Transaction failed after confirmation:",
            confirmation.value.err,
          );
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in cancelVoucherListing:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full cancel listing error:", error);
    },
  });

  // Cancel Voucher Bid Mutation
  const cancelVoucherBid = useMutation({
    mutationKey: ["cancel-voucher-bid", { cluster }],
    mutationFn: async ({
      nftMint,
      paymentMint
    }: {
      nftMint: PublicKey;
      paymentMint: PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        const paymentMintInfo = await connection.getAccountInfo(paymentMint);
        const isToken2022 =
            paymentMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ?? true;

        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        const [bidPDA] = await getBidPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        const bidderTokenAccount = await getAssociatedTokenAddress(
            paymentMint,
            publicKey,
            false,
            isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
        );

        // Using bidder-specific escrow for bid cancellation
        const [escrowBidPDA] = await getEscrowBidPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        const tx = await program.methods
          .cancelVoucherBid()
          .accounts({
            bid: bidPDA,
            bidder: publicKey,
            nftMint: nftMint,
            escrowAccount: escrowBidPDA,
            paymentMint: paymentMint,
            bidderTokenAccount: bidderTokenAccount,
            exchange: exchangePDA,
            tokenProgram: isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        // Send and sign transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signedTx = await wallet.signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
        );
        console.log(`Transaction sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          console.error(
            "Transaction failed after confirmation:",
            confirmation.value.err,
          );
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in cancelVoucherBid:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full cancel bid error:", error);
    },
  });

  // Mark Bid for Refund Mutation (admin function)
  const markBidForRefund = useMutation({
    mutationKey: ["mark-bid-for-refund", { cluster }],
    mutationFn: async ({
      nftMint,
      bidder,
    }: {
      nftMint: PublicKey;
      bidder: PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        console.log(
          "Marking bid for refund. NFT:",
          nftMint.toString(),
          "Bidder:",
          bidder.toString(),
        );

        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        const [bidPDA] = await getBidPDA(
          bidder,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        const tx = await program.methods
          .markBidForRefund()
          .accounts({
            authority: publicKey,
            exchange: exchangePDA,
            nftMint: nftMint,
            bidder: bidder,
            bid: bidPDA,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        // Send and sign transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signedTx = await wallet.signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
        );
        console.log(`Transaction sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          console.error(
            "Transaction failed after confirmation:",
            confirmation.value.err,
          );
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in markBidForRefund:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full mark for refund error:", error);
    },
  });

  // Refund Bid Mutation
  const refundBid = useMutation({
    mutationKey: ["refund-bid", { cluster }],
    mutationFn: async ({
      nftMint,
      paymentMint,
      bidderTokenAccount,
    }: {
      nftMint: PublicKey;
      paymentMint: PublicKey;
      bidderTokenAccount: PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      try {
        const [exchangePDA] = await getExchangePDA(VOUCHER_EXCHANGE_PROGRAM_ID);
        const [bidPDA] = await getBidPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        // Using bidder-specific escrow for bid refunds
        const [escrowBidPDA] = await getEscrowBidPDA(
          publicKey,
          nftMint,
          VOUCHER_EXCHANGE_PROGRAM_ID,
        );

        const tx = await program.methods
          .refundBid()
          .accounts({
            bid: bidPDA,
            bidder: publicKey,
            nftMint: nftMint,
            escrowAccount: escrowBidPDA,
            paymentMint: paymentMint,
            bidderTokenAccount: bidderTokenAccount,
            exchange: exchangePDA, // Added exchange to update stats
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        // Send and sign transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signedTx = await wallet.signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
        );
        console.log(`Transaction sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed",
        );

        if (confirmation.value.err) {
          console.error(
            "Transaction failed after confirmation:",
            confirmation.value.err,
          );
          throw new Error(
            `Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`,
          );
        }

        return signature;
      } catch (error) {
        console.error("Error in refundBid:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {},
    onError: (error) => {
      console.error("Full refund bid error:", error);
    },
  });

  return {
    program,
    programId: VOUCHER_EXCHANGE_PROGRAM_ID,

    // Core queries
    getProgramAccount,
    getExchangeAccount,

    // Individual queries (function factories)
    getListingByOwnerAndMint,
    getBidByBidderAndMint,

    // Fetch functions
    fetchActiveListings,
    fetchListingsByNftMint,
    fetchListingsByOwner,
    fetchActiveBids,
    fetchBidsByNftMint,
    fetchBidsByBidder,
    fetchBidsRequiringRefund,

    // Mutations
    initializeExchange,
    createVoucherListing,
    createVoucherBid,
    acceptVoucherBid,
    fulfillVoucherListing,
    cancelVoucherListing,
    cancelVoucherBid,
    markBidForRefund,
    refundBid,
  };
}
