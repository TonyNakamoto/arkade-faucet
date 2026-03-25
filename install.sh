#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "==> npm install"
npm install

echo "==> Python packages (local folder, no sudo)"
rm -rf "$DIR/pydeps"
python3 -m pip install -q --break-system-packages -r "$DIR/requirements.txt" -t "$DIR/pydeps"

if [[ ! -f "$DIR/phrase.txt" ]]; then
  cp "$DIR/phrase.example.txt" "$DIR/phrase.txt"
  chmod 600 "$DIR/phrase.txt"
  echo "Created phrase.txt — edit with: nano phrase.txt"
fi

echo "Done. Start: ./start_faucet.sh"
