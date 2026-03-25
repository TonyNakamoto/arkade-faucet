#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

unset ARKADE_MNEMONIC
export ARKADE_MNEMONIC_FILE="${ARKADE_MNEMONIC_FILE:-$DIR/phrase.txt}"

if [[ ! -f "$ARKADE_MNEMONIC_FILE" ]]; then
  echo "Missing $ARKADE_MNEMONIC_FILE — run ./install.sh"
  exit 1
fi
chmod 600 "$ARKADE_MNEMONIC_FILE" 2>/dev/null || true

if [[ ! -d "$DIR/node_modules" ]]; then
  npm install
fi

if [[ ! -d "$DIR/pydeps" ]] || [[ ! -f "$DIR/pydeps/flask/__init__.py" ]]; then
  echo "Installing Python packages..."
  rm -rf "$DIR/pydeps"
  python3 -m pip install -q --break-system-packages -r "$DIR/requirements.txt" -t "$DIR/pydeps"
fi

export PYTHONPATH="$DIR/pydeps${PYTHONPATH:+:$PYTHONPATH}"

echo "Open http://localhost:5000/  (Ctrl+C to stop)"
exec python3 "$DIR/faucet_server.py"
