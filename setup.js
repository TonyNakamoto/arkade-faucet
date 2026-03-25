import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const mnemonic = generateMnemonic(wordlist);
console.log("!!! SAVE THIS MNEMONIC SECURELY !!!");
console.log(mnemonic);
