"use client";

import { useQuery } from "@tanstack/react-query";
import { axios } from "@/utils/constants";

export type useFetchRewardsType = Array<{
  address: string;
  name: string;
  metadata?: {
    name: string;
    symbol?: string;
    description: string;
    image: string;
    attributes?: {
      "0": {
        trait_type: string;
        value: number;
      };
      "1": {
        trait_type: string;
        value: number;
      };
      "2": {
        trait_type: string;
        value: boolean;
      };
      "3": {
        trait_type: string;
        value: number;
      };
      "4": {
        trait_type: string;
        value: string;
      };
      "5": {
        trait_type: string;
        value: number;
      };
    };
    properties?: {
      files: Array<{
        type: string;
        uri: string;
      }>;
    };
  };
}>;

function useFetchRewards() {
  return useQuery<useFetchRewardsType>({
    queryKey: ["rewards"],
    queryFn: async () => {
      return JSON.parse((await axios.get("/api/rewards"))?.data);
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export default useFetchRewards;
