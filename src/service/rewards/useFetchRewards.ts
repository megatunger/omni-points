"use client";

import { useQuery } from "@tanstack/react-query";
import { axios } from "@/utils/constants";

function useFetchRewards() {
  return useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      return JSON.parse((await axios.get("/api/rewards"))?.data);
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export default useFetchRewards;
