import { generateSecureVoucherCode, simpleCrypto } from "./utils";

const _code = generateSecureVoucherCode();

console.log("Encrypted code:", simpleCrypto.encrypt(_code));
