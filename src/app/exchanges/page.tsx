"use client";

import React, { useState, useEffect } from "react";
import { useVoucherExchange } from "@/service/voucher-exchange-program/useVoucherExchange";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { OptToken } from "@/utils/constants";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  ArrowRightIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  WalletIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";
import useFetchRewards from "@/service/rewards/useFetchRewards"; // Import the rewards fetching hook

const ExchangesPage = () => {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [activeListings, setActiveListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(true);
  const [isLoadingMyListings, setIsLoadingMyListings] = useState(true);
  const [error, setError] = useState(null);
  const [metadataMap, setMetadataMap] = useState({}); // Map to store NFT metadata by address

  // Fetch rewards to get metadata
  const { data: rewardsData, isLoading: isLoadingRewards } = useFetchRewards();

  const {
    fetchActiveListings,
    fetchListingsByOwner,
    fulfillVoucherListing,
    cancelVoucherListing,
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

        // Handle Solana JSON RPC errors specifically
        if (err.message && err.message.includes("Base58DecodeError")) {
          setError(
            "There was an issue connecting to the Solana network. The program ID or account address may be invalid.",
          );
        } else if (
          err.message &&
          err.message.includes("failed to get accounts owned by program")
        ) {
          setError(
            "Failed to fetch program accounts. Please check if the program ID is correct and deployed on this network.",
          );
        } else {
          setError(
            "Failed to fetch marketplace listings. Please try again later.",
          );
        }
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

        // Handle Solana JSON RPC errors
        if (err.message && err.message.includes("Base58DecodeError")) {
          // Don't show error in UI for this tab, just log
          console.warn("Base58 decode error when fetching user listings");
        } else if (
          err.message &&
          err.message.includes("failed to get accounts owned by program")
        ) {
          console.warn("Failed to fetch program accounts for user listings");
        }
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
      console.error("Wallet not connected");
      return;
    }

    try {
      const owner = listing.data.owner;
      // Support both naming conventions
      const nftMint = listing.data.nft_mint || listing.data.nftMint;
      const paymentMint = listing.data.payment_mint || listing.data.paymentMint;

      // Create buyer NFT account
      const buyerNftAccount = await getAssociatedTokenAddress(
        nftMint,
        publicKey,
      );

      // Get payment accounts
      const buyerPaymentAccount = await getAssociatedTokenAddress(
        paymentMint,
        publicKey,
      );

      const ownerPaymentAccount = await getAssociatedTokenAddress(
        paymentMint,
        owner,
      );

      await fulfillVoucherListing.mutateAsync({
        owner,
        nftMint,
        buyerNftAccount,
        paymentMint,
        buyerPaymentAccount,
        ownerPaymentAccount,
      });

      // Refresh listings after purchase
      fetchMarketplaceListings();
    } catch (error) {
      console.error("Error purchasing voucher:", error);
    }
  };

  const handleCancelListing = async (listing) => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    try {
      // Support both naming conventions
      const nftMint = listing.data.nft_mint || listing.data.nftMint;

      await cancelVoucherListing.mutateAsync({
        nftMint,
      });

      // Refresh listings after cancellation
      fetchUserListings();
    } catch (error) {
      console.error("Error canceling listing:", error);
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
        <a
          className={`tab ${activeTab === "marketplace" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("marketplace")}
        >
          <ShoppingCartIcon size={16} className="mr-2" />
          Marketplace
        </a>
        <a
          className={`tab ${activeTab === "my-listings" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("my-listings")}
        >
          <WalletIcon size={16} className="mr-2" />
          My Listings
        </a>
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

                // Find metadata for this NFT if available
                const metadata = metadataMap[nftMintString] || null;

                return (
                  <VoucherListingCard
                    key={listing.address.toString()}
                    listing={listing}
                    metadata={metadata}
                    onPurchase={handlePurchase}
                    walletConnected={!!publicKey}
                    isPending={fulfillVoucherListing.isPending}
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

                // Find metadata for this NFT if available
                const metadata = metadataMap[nftMintString] || null;

                return (
                  <MyListingCard
                    key={listing.address.toString()}
                    listing={listing}
                    metadata={metadata}
                    onCancel={handleCancelListing}
                    isPending={cancelVoucherListing.isPending}
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

// VoucherListingCard component definition (in the same file)
const VoucherListingCard = ({
  listing,
  metadata,
  onPurchase,
  walletConnected,
  isPending,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [localMetadata, setLocalMetadata] = useState(null);
  const wallet = useWallet();
  const { publicKey } = wallet;

  useEffect(() => {
    // If we received metadata from props, use it
    if (metadata) {
      setLocalMetadata(metadata);
      setIsLoading(false);
      return;
    }

    // Otherwise, create fallback metadata
    const createFallbackMetadata = async () => {
      try {
        // Create placeholder metadata if none was provided from the rewards data
        setLocalMetadata({
          name: `Voucher #${listing.address.toString().substring(0, 6)}`,
          description: "Redeemable voucher for exclusive rewards",
          // Use a default image that doesn't require external domains
          image: "/images/placeholder.jpg",
          attributes: {
            price: {
              trait_type: "price",
              value: Number(listing.data.price) / 10 ** 9,
            },
            redeemable_start: {
              trait_type: "redeemable_start",
              value: Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days ago
            },
            redeemable_end: {
              trait_type: "redeemable_end",
              value: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
            },
            expires_at: {
              trait_type: "expires_at",
              value: Math.floor(Date.now() / 1000) + 86400 * 60, // 60 days from now
            },
          },
        });
      } catch (error) {
        console.error("Error creating fallback metadata:", error);
      } finally {
        setIsLoading(false);
      }
    };

    createFallbackMetadata();
  }, [listing, metadata]);

  const handlePurchase = () => {
    setProcessingId(listing.address.toString());
    onPurchase(listing).finally(() => {
      setProcessingId(null);
    });
  };

  const getAttribute = (traitType) => {
    if (!localMetadata?.attributes) return null;

    // Try to find the attribute in the structured format from the rewards data
    const structuredAttr = Object.values(localMetadata.attributes).find(
      (attr) => attr.trait_type === traitType,
    );

    if (structuredAttr) {
      return structuredAttr.value;
    }

    // Fallback to direct property access for our fallback metadata
    return localMetadata.attributes[traitType]?.value;
  };

  const price = getAttribute("price") || Number(listing.data.price) / 10 ** 9;
  const redeemableStart = new Date(getAttribute("redeemable_start") * 1000);
  const redeemableEnd = new Date(getAttribute("redeemable_end") * 1000);
  const expiresAt = new Date(getAttribute("expires_at") * 1000);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl rounded-xl overflow-hidden h-[400px] animate-pulse">
        <div className="bg-gray-300 h-64 w-full"></div>
        <div className="p-4 space-y-3">
          <div className="h-6 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-10 bg-gray-300 rounded w-full mt-4"></div>
        </div>
      </div>
    );
  }

  if (!localMetadata) return null;

  const isProcessing = processingId === listing.address.toString() || isPending;
  const isOwnListing =
    walletConnected && publicKey?.toString() === listing.data.owner.toString();

  // Support both naming conventions
  const nftMintAddr = (
    listing.data.nft_mint || listing.data.nftMint
  )?.toString();

  return (
    <div className="card bg-base-100 shadow-xl rounded-xl overflow-hidden">
      <figure className="relative h-64 w-full">
        {localMetadata.image ? (
          // Use img tag as a fallback to prevent Next.js image errors
          <img
            src={localMetadata.image}
            alt={localMetadata.name}
            className="w-full h-full object-cover"
          />
        ) : (
          // Fallback if no image
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-400 text-lg">Voucher Image</div>
          </div>
        )}
      </figure>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">{localMetadata.name}</h3>
        <p className="text-sm text-gray-600 mb-3">
          {localMetadata.description}
        </p>
        <p className="text-sm text-gray-600 mb-1 truncate">
          <span className="font-semibold">NFT:</span>{" "}
          {nftMintAddr?.substring(0, 16)}...
        </p>
        <p className="text-sm text-gray-600 mb-3 truncate">
          <span className="font-semibold">Seller:</span>{" "}
          {listing.data.owner.toString().substring(0, 16)}...
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Price:</span>
            <span className="font-semibold">{price} points</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Valid from:</span>
            <span>{formatDate(redeemableStart)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Valid until:</span>
            <span>{formatDate(redeemableEnd)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Expires:</span>
            <span>{formatDate(expiresAt)}</span>
          </div>
        </div>

        <button
          onClick={handlePurchase}
          className={`btn btn-primary w-full ${!walletConnected || isOwnListing ? "btn-disabled" : ""}`}
          disabled={!walletConnected || isOwnListing || isProcessing}
        >
          {isProcessing ? (
            <span className="loading loading-spinner mr-2"></span>
          ) : null}

          {!walletConnected ? (
            "Connect Wallet to Purchase"
          ) : isOwnListing ? (
            "This is Your Listing"
          ) : (
            <span className="flex flex-row items-center justify-center">
              Purchase Voucher <ArrowRightIcon className="ml-2" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

// MyListingCard component definition (in the same file)
const MyListingCard = ({ listing, metadata, onCancel, isPending }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [localMetadata, setLocalMetadata] = useState(null);

  useEffect(() => {
    // If we received metadata from props, use it
    if (metadata) {
      setLocalMetadata(metadata);
      setIsLoading(false);
      return;
    }

    // Otherwise, create fallback metadata
    const createFallbackMetadata = async () => {
      try {
        // Placeholder metadata if none was provided from the rewards data
        setLocalMetadata({
          name: `Voucher #${listing.address.toString().substring(0, 6)}`,
          description: "Redeemable voucher for exclusive rewards",
          image: "/images/placeholder.jpg", // Use a local image
          attributes: {
            price: {
              trait_type: "price",
              value: Number(listing.data.price) / 10 ** 9,
            },
            redeemable_start: {
              trait_type: "redeemable_start",
              value: Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days ago
            },
            redeemable_end: {
              trait_type: "redeemable_end",
              value: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
            },
            expires_at: {
              trait_type: "expires_at",
              value: Math.floor(Date.now() / 1000) + 86400 * 60, // 60 days from now
            },
          },
        });
      } catch (error) {
        console.error("Error creating fallback metadata:", error);
      } finally {
        setIsLoading(false);
      }
    };

    createFallbackMetadata();
  }, [listing, metadata]);

  const handleCancel = () => {
    setProcessingId(listing.address.toString());
    onCancel(listing).finally(() => {
      setProcessingId(null);
    });
  };

  const getAttribute = (traitType) => {
    if (!localMetadata?.attributes) return null;

    // Try to find the attribute in the structured format from the rewards data
    const structuredAttr = Object.values(localMetadata.attributes).find(
      (attr) => attr.trait_type === traitType,
    );

    if (structuredAttr) {
      return structuredAttr.value;
    }

    // Fallback to direct property access for our fallback metadata
    return localMetadata.attributes[traitType]?.value;
  };

  const price = getAttribute("price") || Number(listing.data.price) / 10 ** 9;
  const redeemableStart = new Date(getAttribute("redeemable_start") * 1000);
  const redeemableEnd = new Date(getAttribute("redeemable_end") * 1000);
  const expiresAt = new Date(getAttribute("expires_at") * 1000);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl rounded-xl overflow-hidden h-[400px] animate-pulse">
        <div className="bg-gray-300 h-64 w-full"></div>
        <div className="p-4 space-y-3">
          <div className="h-6 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-10 bg-gray-300 rounded w-full mt-4"></div>
        </div>
      </div>
    );
  }

  if (!localMetadata) return null;

  const isProcessing = processingId === listing.address.toString() || isPending;

  // Support both naming conventions
  const nftMintAddr = (
    listing.data.nft_mint || listing.data.nftMint
  )?.toString();

  return (
    <div className="card bg-base-100 shadow-xl rounded-xl overflow-hidden border border-primary">
      <div className="badge badge-primary absolute right-2 top-2 z-10">
        Your Listing
      </div>
      <figure className="relative h-64 w-full">
        {localMetadata.image ? (
          // Use img tag as a fallback to prevent Next.js image errors
          <img
            src={localMetadata.image}
            alt={localMetadata.name}
            className="w-full h-full object-cover"
          />
        ) : (
          // Fallback if no image
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-400 text-lg">Voucher Image</div>
          </div>
        )}
      </figure>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">{localMetadata.name}</h3>
        <p className="text-sm text-gray-600 mb-3">
          {localMetadata.description}
        </p>
        <p className="text-sm text-gray-600 mb-3 truncate">
          <span className="font-semibold">NFT:</span>{" "}
          {nftMintAddr?.substring(0, 16)}...
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Listed Price:</span>
            <span className="font-semibold">{price} points</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Valid from:</span>
            <span>{formatDate(redeemableStart)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Valid until:</span>
            <span>{formatDate(redeemableEnd)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Expires:</span>
            <span>{formatDate(expiresAt)}</span>
          </div>
        </div>

        <button
          onClick={handleCancel}
          className="btn btn-outline btn-error w-full"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XIcon className="mr-2 h-4 w-4" />
          )}
          Cancel Listing
        </button>
      </div>
    </div>
  );
};

export default ExchangesPage;
