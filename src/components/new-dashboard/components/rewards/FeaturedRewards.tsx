import React from "react";
import RewardCard from "./RewardCard";

const rewards = [
  {
    image: <span role="img" aria-label="plane" className="text-4xl">✈️</span>,
    title: "$20 Gift Card",
    points: 1800,
  },
  {
    image: <span role="img" aria-label="coffee" className="text-4xl">☕️</span>,
    title: "Starbucks Gift Card",
    points: 500,
  },
  {
    image: <span role="img" aria-label="gift" className="text-4xl">🎁</span>,
    title: "Donation Gift Card",
    points: 1000,
  },
  {
    image: <span role="img" aria-label="card" className="text-4xl">💳</span>,
    title: "Gift Card",
    points: 1200,
  },
];

const FeaturedRewards = () => (
  <div>
    <h3 className="text-xl font-bold mb-4">Featured Rewards</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {rewards.map((reward, idx) => (
        <RewardCard key={idx} {...reward} />
      ))}
    </div>
  </div>
);

export default FeaturedRewards; 