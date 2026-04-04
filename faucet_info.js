/**
 * Prints one JSON line for the Flask dashboard: address, balance, QR (base64 PNG) for deposit.
 * Usage: node faucet_info.js
 * Requires same env as arkade_logic.js (ARKADE_MNEMONIC or ARKADE_NSEC).
 */

import {
  Wallet,
  SingleKey,
  MnemonicIdentity,
  InMemoryWalletRepository,
  InMemoryContractRepository,
} from "@arkade-os/sdk";
import { bech32 } from "@scure/base";
import QRCode from "qrcode";
import { loadMnemonicPhrase } from "./mnemonic_env.mjs";
import { DRIP_AMOUNT_SATS } from "./drip_config.mjs";

const ARK_SERVER_URL = process.env.ARK_SERVER_URL ?? "https://arkade.computer";
const INDEXER_URL = process.env.INDEXER_URL;

function nsecToSingleKey(nsec) {
  const decoded = bech32.decode(nsec.trim());
  const bytes = bech32.fromWords(decoded.words);
  return SingleKey.fromHex(Buffer.from(bytes).toString("hex"));
}

function createIdentity() {
  const phrase = loadMnemonicPhrase();
  const nsec = process.env.ARKADE_NSEC?.trim();
  if (phrase) {
    return MnemonicIdentity.fromMnemonic(phrase, { isMainnet: true });
  }
  if (nsec) {
    return nsecToSingleKey(nsec);
  }
  throw new Error("Set ARKADE_MNEMONIC, ARKADE_MNEMONIC_FILE, or ARKADE_NSEC");
}

async function main() {
  let identity;
  try {
    identity = createIdentity();
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
  const wallet = await Wallet.create({
    identity,
    arkServerUrl: ARK_SERVER_URL,
    ...(INDEXER_URL ? { indexerUrl: INDEXER_URL } : {}),
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
    settlementConfig: false,
  });

  const address = await wallet.getAddress();
  const balance = await wallet.getBalance();

  const qrPngBase64 = await QRCode.toDataURL(address, {
    errorCorrectionLevel: "M",
    width: 280,
    margin: 2,
  }).then((dataUrl) => dataUrl.replace(/^data:image\/png;base64,/, ""));

  const payload = {
    address,
    dripAmount: DRIP_AMOUNT_SATS,
    balance,
    explorerUrl: `https://arkade.space/address/${address}`,
    qrPngBase64,
  };

  console.log(JSON.stringify(payload));
}

main().catch((e) => {
  console.log(JSON.stringify({ error: e.message }));
  process.exitCode = 1;
});
