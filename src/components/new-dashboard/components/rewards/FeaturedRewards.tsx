import React from "react";
import RewardCard from "./RewardCard";
import useFetchRewards from "@/service/rewards/useFetchRewards";
import { AnimatedGroup } from "@/app/components/motion-primitives/animated-group";

const FeaturedRewards = () => {
  const { data, isLoading } = useFetchRewards();

  const _rewards = data?.filter(
    (e) => !!e.metadata && !!e?.metadata?.attributes,
  );

  if (isLoading) {
    return (
      <div className="flex flex-row gap-4">
        {[...Array(3)].map((_, idx) => (
          <div key={`is_loading_${idx}`} className="flex w-52 flex-col gap-4">
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
    <div>
      <h3 className="text-xl font-bold mb-4">Featured Rewards</h3>
      <AnimatedGroup className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {_rewards?.map((reward, idx) => (
          <RewardCard key={reward.address + reward.name} {...reward} />
        ))}
      </AnimatedGroup>
    </div>
  );
};

export default FeaturedRewards;
