/**
 * Load BIP39 phrase.
 * 1) ARKADE_MNEMONIC env (use on Render/Fly — never commit; set in host dashboard)
 * 2) ARKADE_MNEMONIC_FILE (local dev: phrase.txt)
 */
import fs from "fs";
import { mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export function loadMnemonicPhrase() {
  let raw = process.env.ARKADE_MNEMONIC?.trim() || null;

  if (!raw) {
    const filePath = process.env.ARKADE_MNEMONIC_FILE?.trim();
    if (filePath) {
      try {
        if (fs.existsSync(filePath)) {
          raw = fs.readFileSync(filePath, "utf8");
        }
      } catch (e) {
        throw new Error(`Cannot read ${filePath}: ${e.message}`);
      }
    }
  }

  if (!raw || !String(raw).trim()) {
    return null;
  }

  const phrase = String(raw)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .normalize("NFKD")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

  try {
    mnemonicToEntropy(phrase, wordlist);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `${msg}. Set ARKADE_MNEMONIC in the host dashboard (production) or phrase.txt locally.`
    );
  }
  return phrase;
}
