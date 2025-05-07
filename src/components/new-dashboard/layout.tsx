"use client";

import React, { ReactNode } from "react";
import Header from "@/components/new-dashboard/components/Header";

const NewLayoutDashboard = ({ children }: { children: ReactNode }) => {
  return (
    <div data-theme="caramellatte">
      <div className="min-h-screen bg-base-200 relative">
        <div
          className="absolute inset-0 opacity-[0.4] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
        <div className="max-w-5xl mx-auto px-4 py-6 relative">
          <Header />
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default NewLayoutDashboard;
