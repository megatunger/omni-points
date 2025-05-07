import { useState } from 'react';
import { Offer } from '@/types/bid';

interface OffersTableProps {
  offers: Offer[];
  onAcceptOffer?: (offerId: string) => void;
}

export const OffersTable: React.FC<OffersTableProps> = ({
  offers,
  onAcceptOffer
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const totalPages = Math.ceil(offers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOffers = offers.slice(startIndex, endIndex);

  return (
    <div className="overflow-x-auto bg-neutral rounded-lg">
      <table className="table">
        {/* Table Header */}
        <thead className="bg-neutral-focus text-neutral-content">
          <tr>
            <th>Price</th>
            <th>From</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {currentOffers.map((offer) => (
            <tr key={offer.id} className="hover:bg-neutral-focus/50">
              <td className="font-mono">{offer.amount} SOL</td>
              <td className="font-mono">
                {offer.bidder.slice(0, 6)}...{offer.bidder.slice(-4)}
              </td>
              <td>
                <span
                  className={`badge ${offer.status === 'pending' ? 'badge-warning' : (offer.status == 'accepted' ? 'badge-success' : 'badge-error')}`}
                >
                  {offer.status}
                </span>
              </td>
              <td className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onAcceptOffer?.(offer.id)}
                  disabled={offer.status !== 'pending'}
                >
                  Accept
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onAcceptOffer?.(offer.id)}
                  disabled={offer.status !== 'pending'}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 p-4">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            «
          </button>

          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>

          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to format expiry time
const formatExpiry = (date: Date) => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 30) {
    return `${Math.floor(days / 30)}mo`;
  }
  if (days > 0) {
    return `${days}d`;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) {
    return `${hours}h`;
  }

  return 'Expired';
};