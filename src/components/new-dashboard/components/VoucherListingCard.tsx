// VoucherListingCard component definition (in the same file)
import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowRightIcon } from "lucide-react";
import useDetailNft from "@/service/rewards/useDetailNft";

const VoucherListingCard = ({
  listing,
  metadata,
  onPurchase,
  walletConnected,
  isPending,
}) => {
  const _address = listing?.data?.nftMint?.toString();
  const { data } = useDetailNft({
    address: _address,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [localMetadata, setLocalMetadata] = useState(null);
  const wallet = useWallet();
  const { publicKey } = wallet;

  useEffect(() => {
    // If we received metadata from props, use it
    // if (data) {
    //   setLocalMetadata(metadata);
    //   setIsLoading(false);
    //   return;
    // }

    // Otherwise, create fallback metadata
    const createFallbackMetadata = async () => {
      try {
        // Create placeholder metadata if none was provided from the rewards data
        setLocalMetadata({
          name: data?.name,
          description: data?.metadata?.description,
          // Use a default image that doesn't require external domains
          image: data?.metadata?.image,
          attributes: data?.metadata?.attributes,
        });
      } catch (error) {
        console.error("Error creating fallback metadata:", error);
      } finally {
        setIsLoading(false);
      }
    };

    createFallbackMetadata();
  }, [listing, data]);

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

export default VoucherListingCard;
