// src/components/new-dashboard/components/MyListingCard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import useDetailNft from "@/service/rewards/useDetailNft";
import VoucherDetailModal from "./VoucherDetailModal";

const MyListingCard = ({ listing, metadata, onCancel, isPending }) => {
  const _address = listing?.data?.nftMint?.toString();
  const { data } = useDetailNft({
    address: _address,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localMetadata, setLocalMetadata] = useState(null);
  const wallet = useWallet();
  const { publicKey } = wallet;

  useEffect(() => {
    const createFallbackMetadata = async () => {
      try {
        setLocalMetadata({
          name: data?.name,
          description: data?.metadata?.description,
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

  const handleCancel = (e) => {
    e.stopPropagation(); // Prevent opening modal when clicking cancel
    setIsProcessing(true);
    onCancel(listing).finally(() => {
      setIsProcessing(false);
    });
  };

  const getAttribute = (traitType) => {
    if (!localMetadata?.attributes) return null;

    // Try to find the attribute in the structured format
    const structuredAttr = Object.values(localMetadata.attributes).find(
      (attr) => attr.trait_type === traitType,
    );

    if (structuredAttr) {
      return structuredAttr.value;
    }

    // Fallback
    return localMetadata.attributes[traitType]?.value;
  };

  const price = getAttribute("price") || Number(listing.data.price) / 10 ** 9;
  const redeemableStart = getAttribute("redeemable_start")
    ? new Date(getAttribute("redeemable_start") * 1000)
    : new Date();
  const redeemableEnd = getAttribute("redeemable_end")
    ? new Date(getAttribute("redeemable_end") * 1000)
    : new Date();
  const expiresAt = getAttribute("expires_at")
    ? new Date(getAttribute("expires_at") * 1000)
    : new Date();

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

  // Support both naming conventions
  const nftMintAddr = (
    listing.data.nft_mint || listing.data.nftMint
  )?.toString();

  return (
    <>
      <div
        className="card bg-base-100 shadow-xl rounded-xl overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow"
        onClick={() => setIsModalOpen(true)}
      >
        <figure className="relative h-64 w-full">
          {localMetadata.image ? (
            <img
              src={localMetadata.image}
              alt={localMetadata.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <div className="text-gray-400 text-lg">Voucher Image</div>
            </div>
          )}
        </figure>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{localMetadata.name}</h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {localMetadata.description}
          </p>

          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-lg">{price} points</span>
            <button
              className="btn btn-sm btn-outline"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              Details
            </button>
          </div>

          <button
            onClick={handleCancel}
            className="btn btn-error w-full"
            disabled={isProcessing || isPending}
          >
            {isProcessing || isPending ? (
              <span className="loading loading-spinner mr-2"></span>
            ) : null}
            Cancel Listing
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {isModalOpen && (
        <VoucherDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          listing={listing}
          metadata={localMetadata || data?.metadata}
        />
      )}
    </>
  );
};

export default MyListingCard;
