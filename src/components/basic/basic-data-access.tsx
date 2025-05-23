"use client";

import {
  getVoucherExchangeProgram,
  VOUCHER_EXCHANGE_PROGRAM_ID,
} from "@project/voucher-exchange";
import { useConnection } from "@solana/wallet-adapter-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";

export function useBasicProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const program = getVoucherExchangeProgram(provider);

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(VOUCHER_EXCHANGE_PROGRAM_ID),
  });

  const greet = useMutation({
    mutationKey: ["basic", "greet", { cluster }],
    mutationFn: () => program.methods.greet().rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
    },
    onError: () => toast.error("Failed to run program"),
  });

  return {
    program,
    programId: VOUCHER_EXCHANGE_PROGRAM_ID,
    getProgramAccount,
    greet,
  };
}
