import Image from "next/image";
import React from "react";
import { ArrowRightIcon } from "lucide-react";
import useDecodeSecretCode from "@/service/rewards/useDecodeSecretCode";
import useBurnNft from "@/service/rewards/useBurnNft";
import { DEBUG_UI } from "@/utils/constants";
import useRefundFlight from "@/service/rewards/useRefundFlight";

const RewardReceiptCard = ({ address, name, metadata }) => {
  const { data, isLoading } = useDecodeSecretCode(address);
  const { mutateAsync, isPending } = useBurnNft(address);
  const { mutateAsync: refund, isPending: isRefunding } =
    useRefundFlight(address);
  const code = data?.data?.secretCode;
  const onClick = () => {
    if (name.includes("VIETJET")) {
      const url = `https://www.vietjetair.com/vi/?code=${code}&nftSrc=${address}`;
      navigator.clipboard.writeText(url);
      // window.open(
      //   `https://www.vietjetair.com/vi/?code=${code}&nftSrc=${address}`,
      //   "_blank",
      // );
    }
    if (name.includes("ANA_MANDARA")) {
      const url = `https://www.book-secure.com/index.php?s=results&property=vnkha30848&arrival=2025-05-09&departure=2025-05-10&code=SOVICO&adults1=3&children1=0&locale=vi_VN&currency=VND&stid=khx1wjjsz&showPromotions=1&Hotelnames=ASIAVNHTLAnaMandaraC&hname=ASIAVNHTLAnaMandaraC&Clusternames=ASIAVNHTLAnaMandaraC&cluster=ASIAVNHTLAnaMandaraC&redir=BIZ-so5523q0o4&rt=1665633011`;
      navigator.clipboard.writeText(url);
    }
  };
  return (
    <div className="card bg-base-100 shadow-xl rounded-xl overflow-hidden">
      <figure className="relative h-64 w-full">
        {metadata.image && (
          <Image
            src={metadata.image}
            alt={metadata.name}
            fill
            className="object-cover grayscale"
          />
        )}
      </figure>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">{name}</h3>
        <p>Your secret code is: {data?.data?.secretCode}</p>
        <p className="mt-4">
          Please use below button to redirect to booking page
        </p>
        <button onClick={onClick} className="btn btn-success w-full mt-12">
          Go to Booking page
          <ArrowRightIcon className="ml-2" />
          {isLoading && <span className="loading loading-spinner mr-2"></span>}
        </button>
        <button onClick={refund} className="btn btn-warning w-full mt-4">
          Booking canceled? Get refund
          <ArrowRightIcon className="ml-2" />
          {isRefunding && (
            <span className="loading loading-spinner mr-2"></span>
          )}
        </button>
        {DEBUG_UI && (
          <button onClick={mutateAsync} className="btn btn-danger w-full mt-12">
            (Debug) Burn NFT
            {isPending && (
              <span className="loading loading-spinner mr-2"></span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default RewardReceiptCard;
