"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useFetchRewardsType } from "@/service/rewards/useFetchRewards";
import useEligibleToBuy from "@/service/token/useEligibleToBuy";
import useRedeemReward from "@/service/rewards/useRedeemReward";
import { ArrowRightIcon } from "lucide-react";
import useRevealCode from "@/service/rewards/useRevealCode";
import { useVoucherExchange } from "@/service/voucher-exchange-program/useVoucherExchange";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { DEBUG_UI, OptToken } from "@/utils/constants";
import { useWallet } from "@solana/wallet-adapter-react";
import RewardReceiptCard from "@/components/new-dashboard/components/rewards/RewardReceiptCard";
import useBurnNft from "@/service/rewards/useBurnNft";
import ListingPriceModal from "@/components/new-dashboard/components/ListingPriceModal";

const RewardCard = ({ address, name, metadata }: useFetchRewardsType[0]) => {
  const { mutateAsync, isPending, data } = useRedeemReward(address);
  const { mutateAsync: burnNft, isPending: isBurning } = useBurnNft(address);
  const { mutateAsync: revealCode, isPending: isRevealing } =
    useRevealCode(address);
  const { createVoucherListing } = useVoucherExchange();
  const [isListing, setIsListing] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const wallet = useWallet();
  const { publicKey } = wallet;

  const getAttribute = (traitType: string) => {
    if (!metadata?.attributes) return null;
    return Object.values(metadata?.attributes)?.find(
      (attr) => attr.trait_type === traitType,
    )?.value;
  };

  const price = getAttribute("price") as number;
  const { data: isRedeemable, isLoading } = useEligibleToBuy(price, address);
  const redeemableStart = new Date(
    (getAttribute("redeemable_start") as number) * 1000,
  );
  const redeemableEnd = new Date(
    (getAttribute("redeemable_end") as number) * 1000,
  );
  const expiresAt = new Date((getAttribute("expires_at") as number) * 1000);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOwned = !isLoading && isRedeemable === "owned";

  // Open the price modal
  const handleOpenListingModal = () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    setIsPriceModalOpen(true);
  };

  // Handle listing voucher with price from modal
  const handleListVoucher = async (listingPrice: number) => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    try {
      setIsListing(true);

      // Convert price to proper decimal representation
      // Assuming OptToken has 9 decimals based on the code
      const priceInSmallestUnit = new BN(listingPrice * 10 ** 9);

      // Create the voucher listing
      await createVoucherListing.mutateAsync({
        nftMint: new PublicKey(address),
        paymentMint: OptToken,
        price: priceInSmallestUnit,
      });

      // Close the modal after successful listing
      setIsPriceModalOpen(false);
    } catch (error) {
      console.error("Error listing voucher:", error);
    } finally {
      setIsListing(false);
    }
  };

  if (!metadata) return <></>;

  if (name.includes("RECEIPT")) {
    return <RewardReceiptCard {...{ address, name, metadata }} />;
  }

  return (
    <>
      <div className="card bg-base-100 shadow-xl rounded-xl overflow-hidden">
        <figure className="relative h-64 w-full">
          {metadata.image && (
            <Image
              src={metadata.image}
              alt={metadata.name}
              fill
              className="object-cover"
            />
          )}
        </figure>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{name}</h3>
          <p className="text-sm text-gray-600 mb-3">{metadata.description}</p>
          {DEBUG_UI && (
            <p className="text-sm text-gray-600 mb-3">Address: {address}</p>
          )}

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Price:</span>
              <span className="font-semibold">
                {price?.toLocaleString()} points
              </span>
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
            onClick={() => {
              if (isOwned) {
                return revealCode();
              }
              return mutateAsync();
            }}
            className={`btn btn-primary w-full ${!isRedeemable ? "btn-disabled" : ""}`}
            disabled={!isRedeemable}
          >
            {(isPending || isLoading || isRevealing) && (
              <span className="loading loading-spinner mr-2"></span>
            )}
            {isRedeemable === true && "Redeem"}
            {isRedeemable === false && "Not Available"}
            {isOwned && (
              <span className="flex flex-row items-center justify-center">
                Reveal Code & Booking <ArrowRightIcon className="ml-2" />
              </span>
            )}
          </button>
          {/* Add List Voucher button when the user owns the voucher */}
          {isOwned && (
            <button
              onClick={handleOpenListingModal} // Changed to open the modal
              className="btn btn-secondary w-full mt-2"
              disabled={
                isListing || createVoucherListing.isPending || !publicKey
              }
            >
              {(isListing || createVoucherListing.isPending) && (
                <span className="loading loading-spinner mr-2"></span>
              )}
              Sell on P2P Market
            </button>
          )}
          {DEBUG_UI && (
            <button
              onClick={() => burnNft()}
              className="btn btn-danger w-full mt-12"
            >
              (Debug) Burn NFT
              {isBurning && (
                <span className="loading loading-spinner mr-2"></span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Price Modal */}
      <ListingPriceModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        onSubmit={handleListVoucher}
        isProcessing={isListing || createVoucherListing.isPending}
        initialPrice={price} // Pre-fill with the current price
      />
    </>
  );
};

export default RewardCard;
