<#
.SYNOPSIS
#>

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$SCRIPT_DIR = $PSScriptRoot
Set-Location $SCRIPT_DIR
Write-Host "workdir: $SCRIPT_DIR"

function Install-UV {
    Write-Host "Installing uv..."
    Invoke-RestMethod 'https://astral.sh/uv/install.ps1' | Invoke-Expression
    Write-Host "uv installed!"
}

$VENV_NAME = ".venv"

if (Test-Path $VENV_NAME) {
    Write-Host "Virtual environment already exists: $VENV_NAME"
    exit 0
}

try {
    $null = Get-Command uv -ErrorAction Stop
    $uvVersion = uv --version
    Write-Host "uv version: $uvVersion"
}
catch {
    Install-UV
}

$PYTHON_VERSION = "3.12"

Write-Host "Creating Python $PYTHON_VERSION virtual environment..."
uv venv $VENV_NAME --python=$PYTHON_VERSION

$activatePath = "$VENV_NAME\Scripts\activate.ps1"

if (-not (Test-Path $activatePath)) {
    throw "Activation script not found at: $activatePath"
}

Write-Host "Activating virtual environment..."
. $activatePath

Write-Host "Installing dependencies..."
uv sync --extra cu121 --frozen

Write-Host "Setup completed successfully!"