"use client";

import { AnimatedGroup } from "@/app/components/motion-primitives/animated-group";
import RewardCard from "@/components/new-dashboard/components/rewards/RewardCard";
import React from "react";
import useFetchRewards from "@/service/rewards/useFetchRewards";
import { useWallet } from "@solana/wallet-adapter-react";

const Page = () => {
  const { publicKey, connected } = useWallet();
  const { data, isLoading } = useFetchRewards({
    address: publicKey?.toString(),
  });

  const _rewards = data?.filter(
    (e) => !!e.metadata && !!e?.metadata?.attributes,
  );

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold my-4">Connect your wallet</h2>
        <p className="text-gray-500">
          Please connect your wallet to view rewards.
        </p>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex flex-row gap-4 my-12">
        {[...Array(3)].map((_, idx) => (
          <div className="flex w-52 flex-col gap-4">
            <div className="skeleton h-32 w-full"></div>
            <div className="skeleton h-4 w-28"></div>
            <div className="skeleton h-4 w-full"></div>
            <div className="skeleton h-4 w-full"></div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold my-4">My Rewards</h2>
      <AnimatedGroup className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {_rewards?.map((reward, idx) => (
          <RewardCard key={reward.address} {...reward} />
        ))}
      </AnimatedGroup>
    </div>
  );
};

export default Page;
