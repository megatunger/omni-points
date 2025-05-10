"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface ListingPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (price: number) => void;
  isProcessing?: boolean;
  initialPrice?: number;
}

const ListingPriceModal: React.FC<ListingPriceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isProcessing = false,
  initialPrice,
}) => {
  const [price, setPrice] = useState<string>(initialPrice?.toString() || "");
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate price
    const numericPrice = Number(price);
    if (!price || isNaN(numericPrice) || numericPrice <= 0) {
      setError("Please enter a valid price greater than 0");
      return;
    }

    // Call the onSubmit function with the price
    onSubmit(numericPrice);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 dark:text-white">
          Set Voucher Price
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Price (in points)
            </label>
            <input
              type="number"
              id="price"
              className="input input-bordered w-full dark:bg-gray-700 dark:text-white"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setError("");
              }}
              placeholder="Enter price in points"
              min="1"
              step="1"
              required
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline mr-2"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="loading loading-spinner mr-2"></span>
                  Processing...
                </>
              ) : (
                "Confirm Listing"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListingPriceModal;
