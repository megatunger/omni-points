import React from "react";
import Image from "next/image";
import { useFetchRewardsType } from "@/service/rewards/useFetchRewards";
import useEligibleToBuy from "@/service/token/useEligibleToBuy";

const RewardCard = ({ address, name, metadata }: useFetchRewardsType[0]) => {
  const getAttribute = (traitType: string) => {
    if (!metadata?.attributes) return null;
    return Object.values(metadata?.attributes)?.find(
      (attr) => attr.trait_type === traitType,
    )?.value;
  };

  const price = getAttribute("price") as number;
  const { data: isRedeemable } = useEligibleToBuy(price);
  // const isRedeemable = getAttribute("redeemable") as boolean;
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

  if (!metadata) return <></>;

  return (
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
        <h3 className="font-bold text-lg mb-2">{metadata.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{metadata.description}</p>

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
          className={`btn btn-primary w-full ${!isRedeemable ? "btn-disabled" : ""}`}
          disabled={!isRedeemable}
        >
          {isRedeemable ? "Redeem Now" : "Not Available"}
        </button>
      </div>
    </div>
  );
};

export default RewardCard;
