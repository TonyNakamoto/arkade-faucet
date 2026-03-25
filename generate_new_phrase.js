/**
 * Prints a new random 12-word BIP39 phrase for faucet testing.
 * Run: node generate_new_phrase.js
 *
 * Write the words on paper and store safely. Never commit them to git.
 * Then:
 *   export ARKADE_MNEMONIC='word1 word2 ... word12'
 *   node arkade_logic.js
 * to see ADDR:... and send BTC to that address from arkade.money.
 */

import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const phrase = generateMnemonic(wordlist, 128);
console.log("NEW 12-WORD PHRASE (write this down, keep private):");
console.log("");
console.log(phrase);
console.log("");
console.log("Next:");
console.log("  export ARKADE_MNEMONIC='" + phrase + "'");
console.log("  node arkade_logic.js");
console.log("Send Bitcoin to the ADDR line from arkade.money, wait for confirmations, then drip.");
