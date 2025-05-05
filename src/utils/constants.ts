import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { Axios } from "axios";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import secretKey from "../../secrets/wallet.json";

const cluster = clusterApiUrl("devnet");

export const connection = new Connection(cluster);

export const umi = createUmi(cluster).use(mplTokenMetadata());

export const AppKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

export const axios = new Axios({
  responseType: "json",
});
