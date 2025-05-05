import React from "react";

interface ActivityItemProps {
  description: string;
  date: string;
  points: number;
}

const ActivityItem = ({ description, date, points }: ActivityItemProps) => (
  <div className="flex justify-between items-center py-2 last:border-b-0">
    <div>
      <div className="font-medium">{description}</div>
      <div className="text-xs text-gray-400">{date}</div>
    </div>
    <div
      className={
        points < 0 ? "text-error font-semibold" : "text-success font-semibold"
      }
    >
      {points > 0 ? "+" : ""}
      {points} pt
    </div>
  </div>
);

export default ActivityItem;
