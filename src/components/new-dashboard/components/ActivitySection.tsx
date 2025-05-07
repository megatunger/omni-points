import React from "react";
import ActivityItem from "./ActivityItem";

const activities = [
  {
    description: "Headphones",
    date: "Mar 18",
    points: -320,
  },
  {
    description: "Points earned",
    date: "This month",
    points: 150,
  },
];

const ActivitySection = () => (
  <div className="card bg-base-100 shadow-neutral border-2 border-accent rounded-xl p-4">
    <h3 className="text-lg font-bold mb-2">Your Activity</h3>
    <div className="divider w-full mt-0 mb-0"></div>
    <div className="mb-2">
      {activities.map((activity, idx) => (
        <ActivityItem key={idx} {...activity} />
      ))}
    </div>
  </div>
);

export default ActivitySection;
