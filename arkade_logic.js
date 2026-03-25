/**
 * Arkade faucet drip — @arkade-os/sdk Wallet.sendBitcoin (offchain VTXOs).
 *
 * Identity (set ONE of these env vars):
 *   ARKADE_MNEMONIC — 12 or 24 English BIP39 words (one line)
 *   ARKADE_MNEMONIC_FILE — path to a file with the phrase (avoids shell quoting issues)
 *   ARKADE_NSEC — Nostr nsec1... (often does NOT match arkade.money Receive)
 *
 * Optional:
 *   ARK_SERVER_URL   — default https://arkade.computer
 *   INDEXER_URL
 *   DRIP_AMOUNT      — default 1
 *   ARK_DEBUG        — "1" for stderr diagnostics
 *
 * CLI: node arkade_logic.js [recipient_ark1...]
 *      No args → ADDR:<ark address> (fund this from arkade.money before dripping)
 */

import {
  Wallet,
  SingleKey,
  MnemonicIdentity,
  InMemoryWalletRepository,
  InMemoryContractRepository,
} from "@arkade-os/sdk";
import { bech32 } from "@scure/base";
import { loadMnemonicPhrase } from "./mnemonic_env.mjs";

const ARK_SERVER_URL = process.env.ARK_SERVER_URL ?? "https://arkade.computer";
const INDEXER_URL = process.env.INDEXER_URL;
const DRIP_AMOUNT = Math.max(1, Number.parseInt(process.env.DRIP_AMOUNT ?? "1", 10));
const DEBUG = process.env.ARK_DEBUG === "1";

function logDebug(...args) {
  if (DEBUG) {
    console.error("[arkade_logic]", ...args);
  }
}

function nsecToSingleKey(nsec) {
  const decoded = bech32.decode(nsec.trim());
  if (decoded.prefix !== "nsec") {
    throw new Error("Expected nsec1... bech32 key in ARKADE_NSEC");
  }
  const bytes = bech32.fromWords(decoded.words);
  if (bytes.length !== 32) {
    throw new Error(`Decoded nsec must be 32 bytes, got ${bytes.length}`);
  }
  return SingleKey.fromHex(Buffer.from(bytes).toString("hex"));
}

function createIdentity() {
  let phrase;
  try {
    phrase = loadMnemonicPhrase();
  } catch (e) {
    throw new Error(e.message);
  }
  const nsec = process.env.ARKADE_NSEC?.trim();
  if (phrase) {
    return MnemonicIdentity.fromMnemonic(phrase, { isMainnet: true });
  }
  if (nsec) {
    return nsecToSingleKey(nsec);
  }
  throw new Error(
    "Set ARKADE_MNEMONIC, ARKADE_MNEMONIC_FILE, or ARKADE_NSEC — see arkade_logic.js header"
  );
}

async function spendableOffchainPool(wallet) {
  const coins = await wallet.getVtxos({ withRecoverable: false });
  const sum = coins.reduce((a, c) => a + c.value, 0);
  return { coins, sum };
}

async function run() {
  let identity;
  try {
    identity = createIdentity();
  } catch (e) {
    console.log(`ERROR_DETAIL:${e.message}`);
    process.exitCode = 1;
    return;
  }

  const recipient = process.argv[2];
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

  const addr = await wallet.getAddress();
  if (!recipient) {
    console.log(`ADDR:${addr}`);
    return;
  }

  if (!recipient.startsWith("ark1")) {
    console.log("ERROR_DETAIL:Recipient must be an ark1... Ark address");
    process.exitCode = 1;
    return;
  }

  const balance = await wallet.getBalance();
  logDebug("ark address", addr);
  logDebug("balance", balance);

  try {
    const { finalized, pending } = await wallet.finalizePendingTxs();
    logDebug("finalizePendingTxs", { finalized, pending });
  } catch (e) {
    logDebug("finalizePendingTxs skipped/failed", e?.message ?? e);
  }

  let { coins, sum } = await spendableOffchainPool(wallet);
  logDebug(
    "spendable offchain pool",
    coins.length,
    "vtxos,",
    sum,
    "sats (sendBitcoin uses this only; boarding UTXOs are ignored)"
  );

  if (sum < DRIP_AMOUNT) {
    const boarding = balance.boarding?.total ?? 0;
    const hint =
      boarding > 0 && sum === 0
        ? ` Funds look to be on the boarding address only (${boarding} sats boarding). sendBitcoin spends offchain VTXOs; run a settlement flow (wallet.settle) to move boarding funds into Ark first.`
        : boarding > 0
          ? ` boarding=${boarding} sats is not used by sendBitcoin.`
          : "";
    console.log(
      `ERROR_DETAIL:Insufficient funds: spendable offchain VTXOs sum to ${sum} sats, need ${DRIP_AMOUNT}.${hint} Check ARK_SERVER_URL / INDEXER_URL match the network where you deposited (same as the explorer backend).`
    );
    process.exitCode = 1;
    return;
  }

  try {
    console.error(`[ARKADE] Drip ${DRIP_AMOUNT} sats to ${recipient}`);
    const txid = await wallet.sendBitcoin({
      address: recipient,
      amount: DRIP_AMOUNT,
    });
    console.log(`SUCCESS:${txid}`);
  } catch (e) {
    console.log(`ERROR_DETAIL:${e.message}`);
    process.exitCode = 1;
  }
}

run();
