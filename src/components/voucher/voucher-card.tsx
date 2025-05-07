'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import { Voucher } from '@/types/voucher';
import toast from 'react-hot-toast';
import { VoucherDialog } from './voucher-dialog';
import { ActiveConfirmationDialog } from './active-confirmation-dialog';
import { IconAlertTriangleFilled, IconCheck, IconInfoHexagonFilled } from '@tabler/icons-react';
import { BidDialog } from './bid-dialog';

interface VoucherCardProps {
  voucher: Voucher;
  isOwned?: boolean;
  onBuy: (voucherId: string) => void;
  onSell: (voucherId: string) => void;
}


export const VoucherCard: React.FC<VoucherCardProps> = ({
  voucher,
  isOwned = false,
  onBuy,
  onSell,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showUseConfirmation, setShowUseConfirmation] = useState(false);
  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);

  const fallbackImage = '/images/placeholder-voucher.jpg'; // Add a placeholder image in your public folder

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const handleUseNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!voucher.isRedeemed) {
      setShowUseConfirmation(true);
    } else {
      // Simply open dialog for already used vouchers
      setIsDialogOpen(true);
    }

  }
  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBuy(voucher.id);
  }

  const handleSell = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSell(voucher.id);
  }

  const handleBid = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBidDialogOpen(true);
  }

  const handlePlaceBid = (bidAmount: number) => {
    // Handle bid logic here
    toast.success(`Bid of ${bidAmount} placed successfully!`);
  }

  return (
    <>
      <div
        className="card w-96 bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-base-200 cursor-pointer"
        onClick={() => setIsDialogOpen(true)}
      >
        {isOwned && voucher.isRedeemed && (
          <div className="absolute top-0 left-0 z-10">
            <div className="tooltip tooltip-right" data-tip="This voucher cannot be sold because the discount code has been revealed">
              <div className="badge badge-info gap-2 p-4 shadow-lg backdrop-blur-xl bg-info/90">
                <IconInfoHexagonFilled size={20} className="stroke-[0.5] text-info-content" />
              </div>
            </div>
          </div>
        )}

        <figure className="px-10 pt-10 relative h-[200px]">
          <Image
            src={imageError ? fallbackImage : voucher.thumbnailUrl}
            alt={voucher.name}
            fill
            sizes="(max-width: 200px) 100vw, 200px"
            className="rounded-xl object-cover transform transition-transform duration-300"
            onError={() => setImageError(true)}
            unoptimized={voucher.thumbnailUrl.startsWith('http')}
          />
        </figure>
        <div className="card-body">
          <h2 className="card-title">{voucher.brand}</h2>
          <p className="text-lg font-semibold">{voucher.name}</p>
          <div className="text-sm text-gray-600">
            <p>{formatDate(voucher.validFrom)} - {formatDate(voucher.validTo)}</p>
          </div>
          <div className="card-actions justify-between items-center mt-4">
            <span className="text-primary font-bold">{voucher.points} OPT</span>

            {/* Available voucher */}
            {!isOwned && (
              <div className="flex gap-2">
                <button
                  className="btn btn-primary hover:btn-primary transition-colors duration-300"
                  onClick={handleBuy}
                >
                  Buy
                </button>
                <button
                  className="btn btn-secondary hover:btn-secondary transition-colors duration-300"
                  onClick={handleBid}
                >
                  Bid
                </button>
              </div>
            )}

            {/* Owned voucher */}
            {isOwned && (
              <div className="flex gap-2">
                {!voucher.isRedeemed && (
                  <button
                    className="btn btn-primary hover:btn-primary transition-colors duration-300"
                    onClick={handleSell}
                  >
                    Sell
                  </button>
                )}
                <button
                  className="btn btn-secondary hover:btn-secondary transition-colors duration-300"
                  onClick={(event) => handleUseNow(event)}
                >
                  Use Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <VoucherDialog
        voucher={voucher}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        isOwned={isOwned}
      />

      <ActiveConfirmationDialog
        isOpen={showUseConfirmation}
        onClose={() => setShowUseConfirmation(false)}
        onConfirm={() => {
          setIsDialogOpen(true);
          setShowUseConfirmation(false);
        }
        }
        title="Use Voucher"
        message="Are you sure you want to use this voucher? Once used, it cannot be sold or transferred."
      />

      <BidDialog
        voucher={voucher}
        isOpen={isBidDialogOpen}
        onClose={() => setIsBidDialogOpen(false)}
        onPlaceBid={(voucherId, bidAmount) => {
          handlePlaceBid(bidAmount);
        }}
      />

    </>
  );
};