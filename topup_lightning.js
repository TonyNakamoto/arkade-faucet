import {
  Wallet,
  MnemonicIdentity,
  SingleKey,
  InMemoryWalletRepository,
  InMemoryContractRepository,
} from "@arkade-os/sdk";
import { ArkadeSwaps, BoltzSwapProvider } from "@arkade-os/boltz-swap";
import { bech32 } from "@scure/base";
import { loadMnemonicPhrase } from "./mnemonic_env.mjs";
import QRCode from "qrcode";

const ARK_SERVER_URL = process.env.ARK_SERVER_URL ?? "https://arkade.computer";
const INDEXER_URL = process.env.INDEXER_URL;
const BOLTZ_API_URL = process.env.BOLTZ_API_URL ?? "https://api.ark.boltz.exchange";

/** In-memory swap store for Node (no IndexedDB). Matches @arkade-os/boltz-swap SwapRepository. */
class InMemorySwapRepository {
  constructor() {
    this.version = 1;
    /** @type {Map<string, object>} */
    this._swaps = new Map();
  }

  async saveSwap(swap) {
    this._swaps.set(swap.id, JSON.parse(JSON.stringify(swap)));
  }

  async deleteSwap(id) {
    this._swaps.delete(id);
  }

  async getAllSwaps(filter) {
    let list = [...this._swaps.values()];
    if (!filter) return list;
    if (
      (Array.isArray(filter.id) && filter.id.length === 0) ||
      (Array.isArray(filter.status) && filter.status.length === 0) ||
      (Array.isArray(filter.type) && filter.type.length === 0)
    ) {
      return [];
    }
    if (filter.id !== undefined) {
      if (Array.isArray(filter.id)) {
        list = list.filter((s) => filter.id.includes(s.id));
      } else {
        list = list.filter((s) => s.id === filter.id);
      }
    }
    if (filter.status !== undefined) {
      if (Array.isArray(filter.status)) {
        list = list.filter((s) => filter.status.includes(s.status));
      } else {
        list = list.filter((s) => s.status === filter.status);
      }
    }
    if (filter.type !== undefined) {
      if (Array.isArray(filter.type)) {
        list = list.filter((s) => filter.type.includes(s.type));
      } else {
        list = list.filter((s) => s.type === filter.type);
      }
    }
    if (filter.orderBy === "createdAt") {
      const dir = filter.orderDirection === "desc" ? -1 : 1;
      list.sort((a, b) => (a.createdAt - b.createdAt) * dir);
    }
    return list;
  }

  async clear() {
    this._swaps.clear();
  }

  async [Symbol.asyncDispose]() {}
}

function nsecToSingleKey(nsec) {
  const decoded = bech32.decode(nsec.trim());
  const bytes = bech32.fromWords(decoded.words);
  return SingleKey.fromHex(Buffer.from(bytes).toString("hex"));
}

function createIdentity() {
  const phrase = loadMnemonicPhrase();
  const nsec = process.env.ARKADE_NSEC?.trim();
  if (phrase) return MnemonicIdentity.fromMnemonic(phrase, { isMainnet: true });
  if (nsec) return nsecToSingleKey(nsec);
  throw new Error("Set ARKADE_MNEMONIC, ARKADE_MNEMONIC_FILE, or ARKADE_NSEC");
}

async function getLimits() {
  const provider = new BoltzSwapProvider({ apiUrl: BOLTZ_API_URL, network: "bitcoin" });
  const limits = await provider.getLimits();
  let fees = {};
  try {
    fees = await provider.getFees();
  } catch {
    /* optional */
  }
  return {
    min: limits.min,
    max: limits.max,
    fees,
  };
}

/** Fast path: full settlement init can exceed Flask timeout during create. */
async function createWalletForInvoice() {
  return Wallet.create({
    identity: createIdentity(),
    arkServerUrl: ARK_SERVER_URL,
    ...(INDEXER_URL ? { indexerUrl: INDEXER_URL } : {}),
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
    settlementConfig: false,
  });
}

/** Claim needs default settlement for Ark joinBatch / submitTx. */
async function createWalletForClaim() {
  return Wallet.create({
    identity: createIdentity(),
    arkServerUrl: ARK_SERVER_URL,
    ...(INDEXER_URL ? { indexerUrl: INDEXER_URL } : {}),
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
  });
}

async function createSwaps(wallet) {
  return ArkadeSwaps.create({
    wallet,
    swapProvider: new BoltzSwapProvider({ apiUrl: BOLTZ_API_URL, network: "bitcoin" }),
    swapManager: false,
    swapRepository: new InMemorySwapRepository(),
  });
}

async function makeLightning() {
  const amount = Number(process.argv[3] || 0);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error("Amount must be a positive whole number in sats");
  }
  const limits = await getLimits();
  if (amount < limits.min || amount > limits.max) {
    throw new Error(`Amount must be between ${limits.min} and ${limits.max} sats`);
  }
  const wallet = await createWalletForInvoice();
  const swaps = await createSwaps(wallet);
  const result = await swaps.createLightningInvoice({
    amount,
    description: "Top up arkade faucet",
  });
  /** Avoid relying on a third-party GET URL for the QR — long BOLT11 strings can be truncated. */
  const invoiceQrDataUrl = await QRCode.toDataURL(result.invoice, {
    width: 220,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  console.log(
    JSON.stringify({
      amount: result.amount,
      invoice: result.invoice,
      expiry: result.expiry,
      paymentHash: result.paymentHash,
      pendingSwap: result.pendingSwap,
      invoiceQrDataUrl,
      limits,
    })
  );
}

async function claimLightning() {
  const pendingRaw = process.argv[3] || "";
  if (!pendingRaw) throw new Error("Missing pending swap payload");
  const pendingSwap = JSON.parse(pendingRaw);
  const wallet = await createWalletForClaim();
  const swaps = await createSwaps(wallet);
  const out = await swaps.waitAndClaim(pendingSwap);
  console.log(JSON.stringify({ txid: out.txid }));
}

async function main() {
  const cmd = (process.argv[2] || "").toLowerCase();
  if (!cmd || !["limits", "create", "claim"].includes(cmd)) {
    throw new Error("Usage: node topup_lightning.js <limits|create|claim> [amount|pendingSwapJson]");
  }
  if (cmd === "limits") {
    console.log(JSON.stringify(await getLimits()));
    return;
  }
  if (cmd === "create") {
    await makeLightning();
    return;
  }
  await claimLightning();
}

main().catch((e) => {
  console.log(JSON.stringify({ error: e?.message || String(e) }));
  process.exitCode = 1;
});
