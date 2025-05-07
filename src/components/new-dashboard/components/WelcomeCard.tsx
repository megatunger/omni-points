"use client";

import React from "react";
import ActivitySection from "@/components/new-dashboard/components/ActivitySection";
import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatedNumber } from "@/app/components/motion-primitives/animated-number";
import useFetchCurrentVikkiToken from "@/service/token/useFetchCurrentVikkiToken";

const WelcomeCard = () => {
  const { connected, connecting, publicKey } = useWallet();
  const { data, isLoading } = useFetchCurrentVikkiToken();

  const points = data?.amount || 0;
  if (connecting) {
    return <div className="skeleton h-100 w-full"></div>;
  }

  if (!connected) {
    return (
      <div className="card bg-base-100 shadow-sm rounded-lg p-6 flex flex-row items-center justify-center">
        Wallet not connected
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm rounded-lg p-6 flex flex-row items-center justify-center">
      <div className="flex-1/4">
        <h2 className="text-3xl font-bold mb-2 overflow-hidden pr-3">
          <span className="font-normal">Welcome back,</span> {`\n`}
          {publicKey?.toString()?.slice(0, 14)}...
        </h2>

        {isLoading ? (
          <div className="skeleton h-8 w-24 mb-4"></div>
        ) : (
          <p className="mb-4 text-lg">
            Your points:
            <span className="ml-2 font-semibold">
              <AnimatedNumber
                className="inline-flex items-center font-mono text-2xl"
                springOptions={{
                  bounce: 0,
                  duration: 2000,
                }}
                value={points}
              />
            </span>
          </p>
        )}
        <button className="btn btn-primary">View Your Rewards</button>
      </div>
      <div className="flex-2/4">
        <ActivitySection />
      </div>
    </div>
  );
};

export default WelcomeCard;
