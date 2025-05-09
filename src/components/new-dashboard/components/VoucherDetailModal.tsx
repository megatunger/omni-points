"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
import { useVoucherExchange } from "@/service/voucher-exchange-program/useVoucherExchange";
import BidForm from "./BidForm";
import BidsList from "./BidsList";
import { formatDate } from "@/utils/date";
import { OptToken } from "@/utils/constants";
import { toast } from "react-hot-toast";

interface VoucherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
  metadata: any;
  refreshBids?: () => void;
}

const VoucherDetailModal = ({
  isOpen,
  onClose,
  listing,
  metadata,
  refreshBids,
}: VoucherDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<"details" | "bids">("details");
  const [bids, setBids] = useState([]);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const { publicKey, wallet } = useWallet();
  const { acceptVoucherBid, cancelVoucherBid, fetchBidsByNftMint, program } =
    useVoucherExchange();

  const nftMint = listing?.data?.nft_mint || listing?.data?.nftMint;
  const isOwner =
    publicKey && listing?.data?.owner.toString() === publicKey.toString();

  // Fetch bids when the modal opens or when the active tab changes to bids
  useEffect(() => {
    if (isOpen && activeTab === "bids" && nftMint) {
      loadBids();
    }
  }, [isOpen, activeTab, nftMint]);

  const loadBids = async () => {
    if (!nftMint || !program) return;

    setIsLoadingBids(true);
    try {
      // Direct function call instead of using mutateAsync
      const result = await fetchBidsByNftMint(new PublicKey(nftMint));
      setBids(result);
    } catch (error) {
      console.error("Error loading bids:", error);
    } finally {
      setIsLoadingBids(false);
    }
  };

  const handleAcceptBid = async (bidderAddress: string) => {
    if (!nftMint || !isOwner || !publicKey) return;

    try {
      // Get bid information
      const bidder = new PublicKey(bidderAddress);
      const nftMintPK = new PublicKey(nftMint);

      // Get payment mint information from listing
      const paymentMintStr =
        listing.data.payment_mint || listing.data.paymentMint;
      const paymentMint = new PublicKey(paymentMintStr || OptToken);

      // Execute accept bid transaction
      await acceptVoucherBid.mutateAsync({
        bidder,
        nftMint: nftMintPK,
        paymentMint,
      });

      toast.success("Bid accepted! Voucher sold successfully.");

      // Refresh bids after acceptance
      loadBids();

      // Refresh bids on parent component if needed
      if (refreshBids) {
        refreshBids();
      }

      // Close modal after accepting bid
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error("Error accepting bid:", error);
      toast.error("Failed to accept bid. Please try again.");
    }
  };

  const handleCancelBid = async (paymentMint: string) => {
    if (!nftMint || !publicKey) return;

    try {
      await cancelVoucherBid.mutateAsync({
        paymentMint: new PublicKey(paymentMint),
        nftMint: new PublicKey(nftMint),
      });

      console.log(paymentMint)

      // Refresh bids after cancellation
      loadBids();

      // Refresh bids on parent component if needed
      if (refreshBids) {
        refreshBids();
      }
    } catch (error) {
      console.error("Error cancelling bid:", error);
      toast.error("Failed to cancel bid. Please try again.");
    }
  };

  const handleBidSubmitted = () => {
    if (activeTab === "bids") {
      loadBids();
    } else {
      setActiveTab("bids");
    }

    // Refresh bids on parent component if needed
    if (refreshBids) {
      refreshBids();
    }
  };

  if (!isOpen) return null;

  const getAttribute = (traitType: string) => {
    if (!metadata?.attributes) return null;

    // Try to find the attribute in the structured format from the rewards data
    const structuredAttr = Object.values(metadata.attributes).find(
      (attr: any) => attr.trait_type === traitType,
    );

    if (structuredAttr) {
      return (structuredAttr as any).value;
    }

    // Fallback to direct property access
    return metadata.attributes[traitType]?.value;
  };

  const price = getAttribute("price") || Number(listing.data.price) / 10 ** 9;
  const redeemableStart = getAttribute("redeemable_start")
    ? new Date(getAttribute("redeemable_start") * 1000)
    : null;
  const redeemableEnd = getAttribute("redeemable_end")
    ? new Date(getAttribute("redeemable_end") * 1000)
    : null;
  const expiresAt = getAttribute("expires_at")
    ? new Date(getAttribute("expires_at") * 1000)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-5 p-4 overflow-y-auto">
      <div className="relative bg-base-100 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-base-100 p-6 border-b border-base-300 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">
            {metadata?.name || "Voucher Details"}
          </h2>
          <button onClick={onClose} className="btn btn-circle btn-sm">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left column - Image and price */}
            <div className="md:w-1/2">
              {metadata?.image ? (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={metadata.image}
                    alt={metadata?.name || "Voucher"}
                    className="w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">No image available</span>
                </div>
              )}

              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">Current Price:</p>
                  <p className="text-xl font-bold">{price} points</p>
                </div>

                <p className="text-sm text-gray-500 mt-2">
                  Seller: {listing.data.owner.toString().substring(0, 6)}...
                  {listing.data.owner.toString().slice(-4)}
                </p>
              </div>
            </div>

            {/* Right column - Tabs and content */}
            <div className="md:w-1/2">
              <div className="tabs tabs-boxed mb-4">
                <a
                  className={`tab ${activeTab === "details" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("details")}
                >
                  Details
                </a>
                <a
                  className={`tab ${activeTab === "bids" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("bids")}
                >
                  Bids {bids.length > 0 ? `(${bids.length})` : ""}
                </a>
              </div>

              {activeTab === "details" && (
                <div>
                  <p className="text-base mb-4">{metadata?.description}</p>

                  <div className="space-y-2 mb-4">
                    {redeemableStart && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Valid from:</span>
                        <span>{formatDate(redeemableStart)}</span>
                      </div>
                    )}
                    {redeemableEnd && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Valid until:</span>
                        <span>{formatDate(redeemableEnd)}</span>
                      </div>
                    )}
                    {expiresAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Expires:</span>
                        <span>{formatDate(expiresAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">NFT Address:</span>
                      <span className="truncate max-w-[180px]">
                        {nftMint?.toString()}
                      </span>
                    </div>
                  </div>

                  {/* Place bid form (only show if not the owner) */}
                  {!isOwner && publicKey && (
                    <BidForm
                      nftMint={nftMint}
                      currentPrice={price}
                      onBidSubmitted={handleBidSubmitted}
                    />
                  )}
                </div>
              )}

              {activeTab === "bids" && (
                <div>
                  <BidsList
                    bids={bids}
                    isLoading={isLoadingBids}
                    isOwner={isOwner}
                    onAcceptBid={handleAcceptBid}
                    onCancelBid={handleCancelBid}
                    isPending={
                      acceptVoucherBid.isPending || cancelVoucherBid.isPending
                    }
                    currentWalletAddress={publicKey?.toString()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherDetailModal;
