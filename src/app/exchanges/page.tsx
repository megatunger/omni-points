"use client";

import React, { useState, useEffect } from "react";
import { useVoucherExchange } from "@/service/voucher-exchange-program/useVoucherExchange";
import { useWallet } from "@solana/wallet-adapter-react";
import { RefreshCwIcon, ShoppingCartIcon, WalletIcon } from "lucide-react";
import useFetchRewards from "@/service/rewards/useFetchRewards";
import MyListingCard from "@/components/new-dashboard/components/MyListingCard";
import VoucherListingCard from "@/components/new-dashboard/components/VoucherListingCard";
import { toast } from "react-hot-toast";
import { connection } from "@/utils/constants";

const ExchangesPage = () => {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [activeListings, setActiveListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(true);
  const [isLoadingMyListings, setIsLoadingMyListings] = useState(true);
  const [error, setError] = useState(null);
  const [metadataMap, setMetadataMap] = useState({});

  // Add individual loading states for each button
  const [loadingPurchases, setLoadingPurchases] = useState({});
  const [loadingCancellations, setLoadingCancellations] = useState({});

  // Fetch rewards to get metadata
  const { data: rewardsData, isLoading: isLoadingRewards } = useFetchRewards();

  const {
    fetchActiveListings,
    fetchListingsByOwner,
    fulfillVoucherListing,
    cancelVoucherListing,
    getExchangeAccount,
  } = useVoucherExchange();

  const wallet = useWallet();
  const { publicKey } = wallet;

  // Process rewards data to create a metadata map for easier lookup
  useEffect(() => {
    if (rewardsData && !isLoadingRewards) {
      const metadataByAddress = {};
      rewardsData
        .filter((reward) => !!reward.metadata && !!reward?.metadata?.attributes)
        .forEach((reward) => {
          metadataByAddress[reward.address] = reward.metadata;
        });
      setMetadataMap(metadataByAddress);
    }
  }, [rewardsData, isLoadingRewards]);

  const fetchMarketplaceListings = async () => {
    try {
      setIsLoadingMarketplace(true);
      setError(null);

      try {
        const listings = await fetchActiveListings();
        console.log("Active listings:", listings);

        // Filter out the user's own listings from marketplace
        const filteredListings = publicKey
          ? listings.filter(
              (listing) =>
                listing.data.owner.toString() !== publicKey.toString(),
            )
          : listings;

        setActiveListings(filteredListings);
      } catch (err) {
        console.error("Error fetching active listings:", err);
      }
    } finally {
      setIsLoadingMarketplace(false);
    }
  };

  const fetchUserListings = async () => {
    if (!publicKey) {
      setMyListings([]);
      setIsLoadingMyListings(false);
      return;
    }

    try {
      setIsLoadingMyListings(true);

      try {
        const listings = await fetchListingsByOwner(publicKey);
        console.log("User listings:", listings);

        // Only show active listings
        const activeUserListings = listings.filter(
          (listing) => listing.data.active,
        );
        setMyListings(activeUserListings);
      } catch (err) {
        console.error("Error fetching user listings:", err);
      }
    } finally {
      setIsLoadingMyListings(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceListings();
  }, []);

  useEffect(() => {
    if (activeTab === "my-listings") {
      fetchUserListings();
    }
  }, [activeTab, publicKey]);

  const handlePurchase = async (listing) => {
    if (!publicKey) {
      toast.error("Please connect your wallet to make a purchase");
      return;
    }

    // Store the listing address for tracking loading state
    const listingAddress = listing.address.toString();

    // Set loading state for this specific listing
    setLoadingPurchases((prev) => ({ ...prev, [listingAddress]: true }));

    try {
      // Normalize the data to handle different naming conventions
      const owner = listing.data.owner;
      const nftMint = listing.data.nft_mint || listing.data.nftMint;
      const paymentMint = listing.data.payment_mint || listing.data.paymentMint;
      const paymentMintInfo = await connection.getAccountInfo(paymentMint);

      // Execute the transaction with updated parameters
      const signature = await fulfillVoucherListing.mutateAsync({
        owner,
        nftMint,
        paymentMint,
      });

      // Show success
      toast.success(
        `Purchase successful! Signature: ${signature.substring(0, 8)}...`,
      );

      // Refresh listings after purchase
      fetchMarketplaceListings();
    } catch (error) {
      // Show error
      console.error("Error purchasing voucher:", error);
      toast.error("Purchase failed: " + (error.message || "Unknown error"));
    } finally {
      // Clear loading state for this specific listing
      setLoadingPurchases((prev) => {
        const newState = { ...prev };
        delete newState[listingAddress];
        return newState;
      });
    }
  };

  const handleCancelListing = async (listing) => {
    if (!publicKey) {
      toast.error("Please connect your wallet to cancel a listing");
      return;
    }

    // Store the listing address for tracking loading state
    const listingAddress = listing.address.toString();

    // Set loading state for this specific listing
    setLoadingCancellations((prev) => ({ ...prev, [listingAddress]: true }));

    try {
      // Support both naming conventions
      const nftMint = listing.data.nft_mint || listing.data.nftMint;

      await cancelVoucherListing.mutateAsync({
        nftMint,
      });

      // Show success
      toast.success("Listing canceled successfully!");

      // Refresh listings after cancellation
      fetchUserListings();
      // Also refresh marketplace in case the user switches tabs
      fetchMarketplaceListings();
    } catch (error) {
      // Show error
      console.error("Error canceling listing:", error);
      toast.error("Cancellation failed: " + (error.message || "Unknown error"));
    } finally {
      // Clear loading state for this specific listing
      setLoadingCancellations((prev) => {
        const newState = { ...prev };
        delete newState[listingAddress];
        return newState;
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">P2P Rewards Market</h1>
        <div className="flex gap-2">
          {activeTab === "marketplace" && (
            <button
              onClick={fetchMarketplaceListings}
              className="btn btn-outline gap-2"
              disabled={isLoadingMarketplace}
            >
              {isLoadingMarketplace ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <RefreshCwIcon size={18} />
              )}
              Refresh
            </button>
          )}

          {activeTab === "my-listings" && (
            <button
              onClick={fetchUserListings}
              className="btn btn-outline gap-2"
              disabled={isLoadingMyListings || !publicKey}
            >
              {isLoadingMyListings ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <RefreshCwIcon size={18} />
              )}
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === "marketplace" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("marketplace")}
        >
          <ShoppingCartIcon size={16} className="mr-2" />
          Marketplace
        </button>
        <button
          className={`tab ${activeTab === "my-listings" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("my-listings")}
        >
          <WalletIcon size={16} className="mr-2" />
          My Listings
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <p>{error}</p>
        </div>
      )}

      {activeTab === "marketplace" && (
        <>
          {isLoadingMarketplace || isLoadingRewards ? (
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : activeListings.length === 0 ? (
            <div className="text-center py-16 bg-base-200 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">No Active Listings</h3>
              <p className="text-gray-500">
                There are currently no vouchers listed for sale in the
                marketplace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeListings.map((listing) => {
                // Get the NFT mint from the listing
                const nftMint = listing.data.nft_mint || listing.data.nftMint;
                const nftMintString = nftMint?.toString();
                const listingAddress = listing.address.toString();

                // Find metadata for this NFT if available
                const metadata = metadataMap[nftMintString] || null;

                return (
                  <VoucherListingCard
                    key={listingAddress}
                    listing={listing}
                    metadata={metadata}
                    onPurchase={handlePurchase}
                    walletConnected={!!publicKey}
                    isPending={loadingPurchases[listingAddress]} // Use individual loading state
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "my-listings" && (
        <>
          {!publicKey ? (
            <div className="text-center py-16 bg-base-200 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">
                Wallet Not Connected
              </h3>
              <p className="text-gray-500">
                Please connect your wallet to view your listings.
              </p>
            </div>
          ) : isLoadingMyListings || isLoadingRewards ? (
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : myListings.length === 0 ? (
            <div className="text-center py-16 bg-base-200 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">No Active Listings</h3>
              <p className="text-gray-500">
                You don't have any active voucher listings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myListings.map((listing) => {
                // Get the NFT mint from the listing
                const nftMint = listing.data.nft_mint || listing.data.nftMint;
                const nftMintString = nftMint?.toString();
                const listingAddress = listing.address.toString();

                // Find metadata for this NFT if available
                const metadata = metadataMap[nftMintString] || null;

                return (
                  <MyListingCard
                    key={listingAddress}
                    listing={listing}
                    metadata={metadata}
                    onCancel={handleCancelListing}
                    isPending={loadingCancellations[listingAddress]} // Use individual loading state
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExchangesPage;
