# Phologix

## Develop

node: 22

Before it, you need to install uv.

And download konatagger models and meilisearch then put them in the resources folder.

```shell
pnpm install
pnpm electron-rebuild -f -w better-sqlite3
pnpm dev
```

## Build

### Windows

#### Minimal

Need to download models and meilisearch on startup.

```shell
pnpm build:win
```

#### Full

Build konatagger standalone.

```shell
cd resources/bin/konatagger
source .venv/Scripts/activate
uv pip install pyinstaller
pyinstaller -i logo.ico --noupx --add-data models:models api.py
```

Move the dist folder to resources/bin/konatagger-standalone.

Build phologix full version.

```shell
pnpm build:win:full
```

#### GPU with cuda 12.1

Build konatagger standalone with cuda 12.1.

```shell
cd resources/bin/konatagger
source .venv/Scripts/activate
uv sync --extra cu121
uv pip install pyinstaller
pyinstaller -i logo.ico --noupx --add-data models:models api.py
```

Move the dist folder to resources/bin/konatagger-standalone-cu121.

Build phologix full version with cuda 12.1.

```shell
pnpm build:win:full:cu121
```
