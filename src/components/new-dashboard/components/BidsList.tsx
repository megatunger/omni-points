import React from "react";

interface Bid {
  address: string;
  data: {
    bidder: string;
    nftMint: string;
    price: string;
    paymentMint: string;
    escrowAccount: string;
    active: boolean;
    requiresRefund: boolean;
    bump: number;
    escrowBump: number;
  };
}

interface BidsListProps {
  bids: Bid[];
  isLoading: boolean;
  isOwner: boolean;
  onAcceptBid: (bidderAddress: string) => void;
  onCancelBid?: (paymentMint: string) => void;
  isPending: boolean;
  currentWalletAddress?: string;
}

const BidsList: React.FC<BidsListProps> = ({
  bids,
  isLoading,
  isOwner,
  onAcceptBid,
  onCancelBid,
  isPending,
  currentWalletAddress,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="loading loading-spinner loading-md"></div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No bids have been placed yet.</p>
      </div>
    );
  }

  // Convert price from string to number (assuming it's in lamports or smallest unit)
  // and sort bids by price (highest first)
  const sortedBids = [...bids].sort((a, b) => {
    const priceA = BigInt(a.data.price);
    const priceB = BigInt(b.data.price);
    return priceB > priceA ? 1 : priceB < priceA ? -1 : 0;
  });

  // Helper function to format price
  const formatPrice = (priceString: string) => {
    // Convert string to BigInt and then to Number, divided by 10^9 (assuming SOL or similar)
    const priceInPoints = Number(BigInt(priceString)) / 10 ** 9;
    return priceInPoints.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  // Check if the current user is the bidder
  const isBidder = (bidderAddress: string) => {
    return currentWalletAddress && bidderAddress === currentWalletAddress;
  };

  return (
    <div className="space-y-4">
      {sortedBids.map((bid) => {
        const userIsBidder = isBidder(bid.data.bidder.toString());

        return (
          <div
            key={bid.address}
            className={`border ${userIsBidder ? "border-primary" : "border-base-300"} rounded-lg p-4`}
          >
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-gray-500 text-sm">Bidder:</span>
                <span className="ml-2">
                  {userIsBidder ? (
                    <span className="font-medium text-primary">You</span>
                  ) : (
                    <>
                      {bid.data.bidder.toString().substring(0, 6)}...
                      {bid.data.bidder.toString().slice(-4)}
                    </>
                  )}
                </span>
              </div>
              <div className="text-primary font-bold">
                {formatPrice(bid.data.price)} points
              </div>
            </div>

            <div className="text-sm text-gray-500 flex justify-between">
              <span>Bid ID: {bid.address.toString().substring(0, 6)}...</span>
              <span>
                {bid.data.active ? (
                  <span className="text-green-500">Active</span>
                ) : (
                  <span className="text-red-500">Inactive</span>
                )}
              </span>
            </div>

            {/* Show Accept Bid button for owners */}
            {isOwner && bid.data.active && (
              <div className="mt-3">
                <button
                  onClick={() => onAcceptBid(bid.data.bidder)}
                  disabled={isPending}
                  className="btn btn-primary btn-sm w-full"
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Processing...
                    </>
                  ) : (
                    "Accept Bid"
                  )}
                </button>
              </div>
            )}

            {/* Show Cancel Bid button for bidders */}
            {userIsBidder && bid.data.active && onCancelBid && (
              <div className="mt-3">
                <button
                  onClick={() => onCancelBid(bid.data.paymentMint)}
                  disabled={isPending}
                  className="btn btn-outline btn-error btn-sm w-full"
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Bid"
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BidsList;
