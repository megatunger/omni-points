// src/components/new-dashboard/components/BidForm.tsx
"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { OptToken } from "@/utils/constants";
import { useVoucherExchange } from "@/service/voucher-exchange-program/useVoucherExchange";
import useFetchCurrentVikkiToken from "@/service/token/useFetchCurrentVikkiToken";

interface BidFormProps {
  nftMint: string;
  currentPrice: number;
  onBidSubmitted: () => void;
}

const BidForm: React.FC<BidFormProps> = ({
  nftMint,
  currentPrice,
  onBidSubmitted,
}) => {
  const [bidAmount, setBidAmount] = useState<number>(currentPrice);
  const { publicKey } = useWallet();
  const { createVoucherBid } = useVoucherExchange();
  const { data: tokenBalance } = useFetchCurrentVikkiToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !nftMint || bidAmount <= 0) return;

    try {
      await createVoucherBid.mutateAsync({
        nftMint: new PublicKey(nftMint),
        paymentMint: OptToken,
        price: bidAmount,
      });

      // Notify parent that a bid was submitted
      onBidSubmitted();
    } catch (error) {
      console.error("Error placing bid:", error);
    }
  };

  const availableBalance = tokenBalance?.amount || 0;
  const isInsufficientBalance = bidAmount > availableBalance;
  const isSubmitting = createVoucherBid.isPending;

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Place a Bid</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-control w-full mb-4">
          <label className="label">
            <span className="label-text">Your Bid (points)</span>
          </label>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value))}
            min={currentPrice}
            step="1"
            className="input input-bordered w-full"
            required
          />

          <div className="flex justify-between mt-1">
            <span className="text-xs">Min: {currentPrice} points</span>
            <span className="text-xs">
              Your balance: {availableBalance.toLocaleString()} points
            </span>
          </div>

          {isInsufficientBalance && (
            <p className="text-error text-sm mt-1">Insufficient balance</p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={
            isSubmitting ||
            !publicKey ||
            isInsufficientBalance ||
            bidAmount < currentPrice
          }
        >
          {isSubmitting ? (
            <span className="loading loading-spinner mr-2"></span>
          ) : null}
          Place Bid
        </button>
      </form>
    </div>
  );
};

export default BidForm;
