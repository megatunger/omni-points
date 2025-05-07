import { useState } from 'react';
import { IconCoinFilled } from '@tabler/icons-react';
import { VoucherBidding } from '@/types/bid';
import { Voucher } from '@/types/voucher';
import { OffersTable } from './offers-table';
import Image from 'next/image';

interface BidDialogProps {
  voucher: Voucher;
  isOpen: boolean;
  onClose: () => void;
  onPlaceBid: (voucherId: string, amount: number) => void;
}

export const BidDialog: React.FC<BidDialogProps> = ({
  voucher,
  isOpen,
  onClose,
  onPlaceBid,
}) => {
  const [imageError, setImageError] = useState(false);
  const [bidAmount, setBidAmount] = useState(voucher.points || 0);
  const [activeTab, setActiveTab] = useState<'execute' | 'offers'>('execute');

  if (!isOpen) return null;
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlaceBid(voucher.id, bidAmount);
    onClose();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-5xl bg-neutral text-neutral-content">
        <div className="flex flex-col gap-6">
          <h3 className="text-2xl font-bold mb-6">{voucher.brand} - {voucher.name}</h3>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-bordered">
          <button
            className={`tab tab-lg ${activeTab === 'execute' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('execute')}
          >
            Make a Bid
          </button>
          <button
            className={`tab tab-lg ${activeTab === 'offers' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('offers')}
          >
            Offers
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'execute' ? (
          <div className="mt-6">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left side - Transaction Details */}
              <div className="space-y-4">
                <div className="bg-base-300/10 px-4 rounded-lg space-y-4">
                  {/* Voucher Image and details */}
                  <div className="relative w-full aspect-[16/9] shrink-0">
                    <Image
                      src={imageError ? '/placeholder.png' : (voucher.thumbnailUrl)}
                      alt={voucher.name}
                      fill
                      className="rounded-lg object-cover"
                      sizes="(max-width: 768px) 100vw, 128px"
                      onError={() => setImageError(true)}
                      unoptimized={voucher.thumbnailUrl?.startsWith('http')}
                    />
                  </div>
                  <div className="mt-3 space-y-4">
                    {/* Price Information */}
                    <div className="grid grid-cols-3 gap-4 justify-items-center">
                      <div className="flex flex-col items-center">
                        <span className="text-base-content/70">List Price</span>
                        <div className="flex items-center gap-1 font-medium">
                          <IconCoinFilled size={16} className="text-primary" />
                          <span>{voucher.points} OPT</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-base-content/70">Min Price</span>
                        <div className="flex items-center gap-1 font-medium">
                          <IconCoinFilled size={16} className="text-primary" />
                          <span>{voucher.bid?.minimumPrice == -1 ? "---" : voucher.bid?.minimumPrice + "OPT" || '-'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-base-content/70">Max Price</span>
                        <div className="flex items-center gap-1 font-medium">
                          <IconCoinFilled size={16} className="text-primary" />
                          <span>{voucher.bid?.maximumPrice == -1 ? "---" : voucher.bid?.maximumPrice + "OPT" || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Other details */}
                    <div className="space-y-2">
                      <p className="flex justify-between">
                        <span className="text-base-content/70">Valid From:</span>
                        <span className="font-medium">{new Date(voucher.validFrom).toLocaleDateString()}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-base-content/70">Valid Until:</span>
                        <span className="font-medium">{new Date(voucher.validTo).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right side - Summary */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Place Your Bid</h4>

                <div className="bg-base-300/10 p-6 rounded-lg space-y-4">
                  <div className="space-y-2">
                    <label className="text-md text-neutral-content/70">
                      <p>
                        Enter your bid amount (OPT)
                        <span className="text-primary font-semibold"> *</span>
                      </p>
                    </label>
                    <div className="flex items-center gap-2 bg-basede-300/20 p-2 rounded-lg">
                      <IconCoinFilled size={20} className="text-primary" />
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="input input-md w-24 bg-base-300/20 text-right"
                        min={voucher.bid.minimumPrice == -1 ? 0 : voucher.bid.minimumPrice}
                        max={voucher.bid.maximumPrice == -1 ? 1000000 : voucher.bid.maximumPrice}
                        placeholder={voucher.points.toString()}
                        step="1"
                      />
                    </div>
                    {bidAmount < (voucher.bid?.minimumPrice || 0) && (
                      <p className="text-error text-sm">
                        Bid must be at least {voucher.bid?.minimumPrice} OPT
                      </p>
                    )}
                  </div>
                </div>
                {/* Terms and Action Buttons */}
                <div className="mt-6 space-y-4">
                  <p className="text-sm opacity-60">
                    By clicking "execute" you agree to{' '}
                    <a href="#" className="text-primary hover:underline">
                      Tensor'
                    </a>
                  </p>

                  <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onClose}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleSubmit}
                      disabled={bidAmount < voucher.bid.minimumPrice}
                    >
                      Execute
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) :
          (
            <div className="min-h-[300px]">
              {voucher.bid.offers.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-lg font-bold mb-4">Offers</h3>
                  <OffersTable
                    offers={voucher.bid.offers}
                    onAcceptOffer={(offerId) => {
                      // Handle accept offer logic
                      console.log('Accepting offer:', offerId);
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-neutral-content/60">
                  <p>No offers available</p>
                </div>
              )}
            </div>
          )
        }
      </div>

      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};