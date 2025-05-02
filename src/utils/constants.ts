import { clusterApiUrl, Connection } from "@solana/web3.js";
import { Axios } from "axios";

export const connection = new Connection(clusterApiUrl("devnet"));

export const axios = new Axios({
  responseType: "json",
});
