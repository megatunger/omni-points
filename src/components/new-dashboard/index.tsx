"use client";

import React from "react";
import WelcomeCard from "./components/WelcomeCard";
import FeaturedRewards from "./components/rewards/FeaturedRewards";
import { AnimatedGroup } from "@/app/components/motion-primitives/animated-group";

const NewDashboardPage = () => {
  return (
    <AnimatedGroup className="flex flex-col" preset="scale">
      <div className="mt-12 mb-16">
        <WelcomeCard points={1240} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <FeaturedRewards />
        </div>
        <div></div>
      </div>
    </AnimatedGroup>
  );
};

export default NewDashboardPage;
