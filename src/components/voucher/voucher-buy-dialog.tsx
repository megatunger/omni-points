"use client";

import React, { useState } from "react";
import { Voucher } from "@/types/voucher";
import { IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import toast from "react-hot-toast";

interface VoucherBuyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: Voucher;
}

export const VoucherBuyDialog: React.FC<VoucherBuyDialogProps> = ({
  isOpen,
  onClose,
  voucher,
}) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [nftMintStatus, setNftMintStatus] = useState("idle");
  const [nftMintAddress, setNftMintAddress] = useState("");
  const [metadataUri, setMetadataUri] = useState("");

  // Process the voucher purchase
  const handleBuyVoucher = async () => {
    if (!publicKey || !signTransaction || !connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsLoading(true);
      setNftMintStatus("idle");
      setNftMintAddress("");
      setMetadataUri("");

      // Step 1: Call the voucher API for token transfer
      const response = await fetch("/api/voucher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: publicKey.toString(),
          optAmount: voucher.points,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create token transfer transaction",
        );
      }

      const data = await response.json();
      console.log("Token transfer API response:", data);

      // Check if transaction data exists
      if (!data.transaction) {
        throw new Error("No transaction data received from server");
      }

      // Step 2: Deserialize, sign and send transaction
      console.log("Processing transaction...");
      const txBuffer = Buffer.from(data.transaction, "base64");
      const tx = Transaction.from(txBuffer);

      const signedTx = await signTransaction(tx);
      const serializedTx = signedTx.serialize();

      // Send transaction
      const signature = await connection.sendRawTransaction(serializedTx);
      console.log("Transaction sent with signature:", signature);

      // Wait for confirmation
      const confirmationResult = await connection.confirmTransaction(
        signature,
        "confirmed",
      );

      if (confirmationResult.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmationResult.value.err)}`,
        );
      }

      console.log("Transaction confirmed on-chain");
      toast.success("Token transfer successful! Minting your NFT...");
      setNftMintStatus("minting");

      // Step 3: Call confirm API to mint the NFT
      console.log("Calling NFT minting confirmation API...");
      try {
        // Prepare custom attributes for the NFT
        const attributes = [
          { trait_type: "Brand", value: voucher.brand || "Default Brand" },
          { trait_type: "Points", value: voucher.points.toString() },
          {
            trait_type: "From",
            value:
              voucher.validFrom instanceof Date
                ? voucher.validFrom.toISOString()
                : new Date(voucher.validFrom).toISOString(),
          },
          {
            trait_type: "To",
            value:
              voucher.validTo instanceof Date
                ? voucher.validTo.toISOString()
                : new Date(voucher.validTo).toISOString(),
          },
        ];

        const confirmResponse = await fetch("/api/voucher/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signature: signature,
            userPublicKey: publicKey.toString(),
            voucherName: voucher.name,
            voucherImageUrl: voucher.thumbnailUrl || "",
            voucherDescription: voucher.conditions,
            attributes: attributes,
            uri: metadataUri, // Will be empty string, triggering metadata generation
          }),
        });

        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json();
          console.warn("NFT minting issue:", errorData);
          toast.error("Token transfer confirmed but NFT minting failed");
          setNftMintStatus("failed");
        } else {
          const confirmData = await confirmResponse.json();
          console.log("NFT minted successfully:", confirmData);

          if (confirmData.nftMint) {
            setNftMintAddress(confirmData.nftMint);
            setMetadataUri(confirmData.metadataUri || "");
            setNftMintStatus("success");
            toast.success("Voucher NFT minted successfully!");
          }
        }
      } catch (confirmErr) {
        console.error("Error minting NFT:", confirmErr);
        toast.error("Token transfer confirmed but NFT minting failed");
        setNftMintStatus("failed");
      }

      // Even if NFT minting fails, consider the purchase successful
      // since the token transfer worked
      onClose();
    } catch (error) {
      console.error("Error buying voucher:", error);
      toast.error(error.message || "Failed to process payment");
      setNftMintStatus("idle");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <h3 className="font-bold text-2xl">Purchase Voucher</h3>
            <p className="text-lg mt-2">
              {voucher.brand} - {voucher.name}
            </p>
          </div>

          {/* Voucher Information */}
          <div className="bg-base-200 p-6 rounded-lg space-y-4">
            <div>
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <IconInfoCircle size={20} />
                Purchase Details
              </h4>
              <div className="mt-3 space-y-2">
                <p className="flex justify-between">
                  <span className="text-base-content/70">Price:</span>
                  <span className="font-medium text-primary">
                    {voucher.points} OPT
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-base-content/70">Valid From:</span>
                  <span className="font-medium">
                    {voucher.validFrom instanceof Date
                      ? voucher.validFrom.toLocaleDateString()
                      : new Date(voucher.validFrom).toLocaleDateString()}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-base-content/70">Valid Until:</span>
                  <span className="font-medium">
                    {voucher.validTo instanceof Date
                      ? voucher.validTo.toLocaleDateString()
                      : new Date(voucher.validTo).toLocaleDateString()}
                  </span>
                </p>
                <p className="text-sm text-base-content/70 mt-2">
                  This will exchange {voucher.points} OPT tokens for a voucher
                  NFT in your wallet.
                </p>
              </div>
            </div>
          </div>

          {/* NFT Mint Status */}
          {nftMintStatus === "success" && (
            <div className="alert alert-success flex flex-col items-start">
              <span className="font-medium">NFT minted successfully!</span>
              <span className="text-xs mt-1">
                Mint address: {nftMintAddress}
              </span>
              {metadataUri && (
                <span className="text-xs mt-1">
                  <a
                    href={metadataUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-hover"
                  >
                    View Metadata
                  </a>
                </span>
              )}
            </div>
          )}
          {nftMintStatus === "failed" && (
            <div className="alert alert-warning">
              <span>Token transfer succeeded but NFT minting failed.</span>
            </div>
          )}

          {/* Actions */}
          <div className="modal-action">
            <button className="btn" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleBuyVoucher}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="animate-spin mr-2" />
                  {nftMintStatus === "minting"
                    ? "Minting NFT..."
                    : "Processing..."}
                </>
              ) : (
                `Purchase for ${voucher.points} OPT`
              )}
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose} disabled={isLoading}>
          close
        </button>
      </form>
    </dialog>
  );
};
