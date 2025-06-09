#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR" || exit 1
echo "workdir: $SCRIPT_DIR"

OS="$(uname -s)"
ARCH="$(uname -m)"

echo "system: $OS $ARCH"

install_uv() {
    echo "install uv..."

    case "$OS" in
    Linux* | Darwin*)
        curl -LsSf https://astral.sh/uv/install.sh | sh
        ;;
    MINGW* | MSYS* | CYGWIN*)
        powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
        ;;
    *)
        echo "not support: $OS"
        exit 1
        ;;
    esac

    echo "uv installed!"
}
VENV_NAME=".venv"

if [ -d "$VENV_NAME" ]; then
    echo "virtual environment exists: $VENV_NAME"
    exit 0
fi

if ! command -v uv >/dev/null 2>&1; then
    install_uv
else
    echo "uv installed: $(uv --version)"
fi

PYTHON_VERSION="3.12"

echo "creating Python $PYTHON_VERSION virtual environment..."
uv venv $VENV_NAME --python=$PYTHON_VERSION

case "$OS" in
Linux* | Darwin*)
    source $VENV_NAME/bin/activate
    ;;
MINGW* | MSYS* | CYGWIN*)
    source $VENV_NAME/Scripts/activate
    ;;
esac

echo "install deps..."
uv sync --extra cu121 --frozen

echo "install done!"
