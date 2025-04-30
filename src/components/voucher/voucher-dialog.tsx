'use client'
import React from 'react';
import { Voucher } from '@/types/voucher';
import { IconCopy, IconEye, IconEyeOff, IconInfoCircle } from '@tabler/icons-react';
import toast from 'react-hot-toast';

interface VoucherDialogProps {
  voucher: Voucher;
  isOpen: boolean;
  onClose: () => void;
  isOwned?: boolean;
  onRevealCode?: () => void;
}

export const VoucherDialog: React.FC<VoucherDialogProps> = ({
  voucher,
  isOpen,
  onClose,
  isOwned = false,
  onRevealCode
}) => {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false);

  const toggleDisplayCode = () => {
    console.log('Reveal code clicked');
    if (isCodeVisible) {
      setIsCodeVisible(false);
      return;
    };

    setIsCodeVisible(true);
    onRevealCode?.();
  };
  const handleCopyCode = () => {
    if (voucher.discountCode) {
      navigator.clipboard.writeText(voucher.discountCode);
      toast.success('Discount code copied to clipboard!');
    }
  };

  if (!isOpen) return null;


  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <h3 className="font-bold text-2xl">{voucher.brand}</h3>
            <p className="text-lg mt-2">{voucher.name}</p>
          </div>

          {/* Details Section */}
          <div className="bg-base-200 p-6 rounded-lg space-y-6">
            <div>
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <IconInfoCircle size={20} />
                Voucher Details
              </h4>
              <div className="mt-3 space-y-2">
                <p className="flex justify-between">
                  <span className="text-base-content/70">Value:</span>
                  <span className="font-medium">{voucher.points} OPT</span>
                </p>
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

            <div>
              <h4 className="font-semibold text-lg mb-3">Terms & Conditions</h4>
              <ul className="list-disc list-inside space-y-2 text-base-content/70">
                <li>This voucher is valid for one-time use only</li>
                <li>Cannot be combined with other promotional offers</li>
                <li>Valid only at participating stores</li>
                <li>{voucher.conditions}</li>
                <li>No cash value or cash back</li>
                <li>Must be redeemed by the expiration date</li>
              </ul>
            </div>
          </div>
          {/* Discount code box */}
          {isOwned && voucher.isRedeemed && (
            <div className="bg-base-200 p-6 rounded-lg space-y-3">
              <h4 className="font-semibold text-lg">Discount Code</h4>
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <div
                    className="input input-bordered w-full font-mono text-lg tracking-wider select-none pointer-events-none bg-base-100/50"
                  >
                    {isCodeVisible ? voucher.discountCode : "XXXX-XXXX-XXXX"}
                  </div>
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                    onClick={toggleDisplayCode}
                  >
                    {isCodeVisible ? (
                      <IconEyeOff size={18} className="opacity-60" />
                    ) : (
                      <IconEye size={18} className="opacity-60" />
                    )}
                  </button>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={handleCopyCode}
                >
                  <IconCopy size={18} />
                </button>
              </div>
              <p className="text-sm text-base-content/70">
                {isCodeVisible
                  ? "Keep this code safe - it can only be used once!"
                  : "Click reveal to show your discount code"}
              </p>
            </div>
          )}

          <div className="modal-action">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};