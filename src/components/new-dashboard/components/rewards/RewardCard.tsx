import React, { ReactNode } from "react";

interface RewardCardProps {
  image: ReactNode;
  title: string;
  points: number;
}

const RewardCard = ({ image, title, points }: RewardCardProps) => (
  <div className="card bg-base-100 shadow-md rounded-xl p-4 flex flex-col items-center">
    <div className="mb-4 w-20 h-20 flex items-center justify-center">{image}</div>
    <div className="font-semibold text-lg mb-1">{title}</div>
    <div className="text-sm text-gray-500 mb-3">{points.toLocaleString()} points</div>
    <button className="btn btn-outline btn-sm">Redeem</button>
  </div>
);

export default RewardCard; 