"use client";

import React from "react";
import WelcomeCard from "./components/WelcomeCard";
import FeaturedRewards from "./components/rewards/FeaturedRewards";
import { AnimatedGroup } from "@/app/components/motion-primitives/animated-group";

const NewDashboardPage = () => {
  return (
    <AnimatedGroup className="flex flex-col" preset="scale">
      <div className="mt-12 mb-16">
        <WelcomeCard />
      </div>
      <FeaturedRewards />
    </AnimatedGroup>
  );
};

export default NewDashboardPage;
