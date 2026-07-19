#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR="$SCRIPT_DIR/.venv"
VENV_PYTHON="$VENV_DIR/bin/python"

echo "=== Debate Casebook Engine ==="

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "Error: python3 not found"
  exit 1
fi

# Create or repair venv if needed
if [ ! -x "$VENV_PYTHON" ]; then
  echo "Creating virtual environment..."
  rm -rf "$VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

if ! "$VENV_PYTHON" -c "import sys; print(sys.prefix)" >/dev/null 2>&1; then
  echo "Virtual environment looks invalid, rebuilding..."
  rm -rf "$VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

EXPECTED_PREFIX="$VENV_DIR"
ACTUAL_PREFIX="$("$VENV_PYTHON" -c 'import sys; print(sys.prefix)')"
if [ "$ACTUAL_PREFIX" != "$EXPECTED_PREFIX" ]; then
  echo "Virtual environment points to an old path, rebuilding..."
  rm -rf "$VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
"$VENV_PYTHON" -m pip install -q -r requirements.txt

echo ""
echo "Starting server on http://localhost:8000"
echo "UI: http://localhost:8000/ui/"
echo "API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."
echo ""

"$VENV_PYTHON" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
