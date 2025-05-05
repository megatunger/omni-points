"use client";

import React, { ReactNode } from "react";
import Header from "@/components/new-dashboard/components/Header";
import { useWallet } from "@solana/wallet-adapter-react";

const NewLayoutDashboard = ({ children }: { children: ReactNode }) => {
  return (
    <div data-theme="caramellatte">
      <div className="min-h-screen bg-base-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Header />
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default NewLayoutDashboard;
