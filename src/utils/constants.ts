import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Axios } from "axios";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import secretKey from "../../secrets/wallet.json";
import { createKeyPairSignerFromBytes, createSolanaClient } from "gill";

const cluster = clusterApiUrl("devnet");

export const connection = new Connection(cluster);

export const umi = createUmi(cluster).use(mplTokenMetadata());

export const AppKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

export const OptToken = new PublicKey(
  "opt687jT4FsT6mza5rxMVoZkoSPaNpnorUBMeLY7e61",
);

export const axios = new Axios({
  transformRequest: [(data) => JSON.stringify(data)],
  transformResponse: [(data) => JSON.parse(data)],
  responseType: "json",
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const DEBUG_UI = true;

export const { rpc, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: "devnet",
});
