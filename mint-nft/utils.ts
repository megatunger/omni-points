import SimpleCrypto from "simple-crypto-js";
import _ from "lodash";
import { randomBytes } from "crypto";
const secret = require("../secrets/wallet.json");

const simpleCrypto = new SimpleCrypto(secret);

function generateSecureVoucherCode(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

export const encryptVoucherData = (data: any) => {
  const secret_code = _.find(data, { trait_type: "secret_code" });
  const _code = generateSecureVoucherCode();
  secret_code.value = simpleCrypto.encrypt(generateSecureVoucherCode());
  console.log("Trying to encrypt secret code:", _code);
  return { ...data };
};

export { simpleCrypto };
