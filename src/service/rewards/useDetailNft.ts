import { useQuery } from "@tanstack/react-query";
import { axios } from "@/utils/constants";
import { useFetchRewardsType } from "@/service/rewards/useFetchRewards";

export const keyUseDetailNft = "rewards-detail-nft";

function useDetailNft({ address }: { address?: string } = {}) {
  return useQuery<useFetchRewardsType[0]>({
    queryKey: [keyUseDetailNft, address],
    queryFn: async () => {
      const response = await axios.get("/rewards/detail", {
        params: {
          address,
        },
      });
      return response.data;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export default useDetailNft;
