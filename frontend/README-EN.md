# Frontend Books EN

# Using pnpm Monorepo Workspace and Common Scenarios (Project Guide)

This document explains, step by step, how to use pnpm monorepo in your project, from setup to package add/remove, workspace management, and peer dependency processes, including common tasks and required actions.

---

## 1. Project Workspace & Initial pnpm Setup

### Node.js & Corepack Installation

* **Minimum Node.js:** 18.x (recommended for new projects)
* **Activate Corepack and install pnpm:**

```bash
corepack enable
corepack prepare pnpm@10.11.0 --activate  # or pnpm@latest
pnpm -v
```

### Clone Repo & Set Up pnpm Workspace

```bash
git clone <repo-url>
cd frontend # project root
or main directory
```

### pnpm-workspace.yaml

Create this file in your project root:

```yaml
packages:
  - "game-engine"
  - "game-types/*"
  - "games/*"
```

* This file is the main guide for the workspace. If it's missing or incorrect, workspace features won’t work.

### package.json (root file)

At the root, it should look like:

```json
{
  "name": "frontend-workspace",
  "private": true,
  "workspaces": [
    "game-engine",
    "game-types/*",
    "games/*"
  ],
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint"
  },
  "packageManager": "pnpm@10.11.0"
}
```

---

## 2. Adding and Removing Packages in Workspace

### Adding Packages

#### Automatic (with pnpm)

* **Add to a specific package:**

  ```bash
  cd games/local-test-v0
  pnpm add <package-name>
  ```
* **Add to all projects (shared):**

  ```bash
  cd frontend
  pnpm add -w <package-name>
  ```
* These operations will automatically update pnpm-lock.yaml and node\_modules.

#### Manual (directly edit package.json)

* If you add a dependency manually, just run:

  ```bash
  pnpm install
  ```
* pnpm will automatically sync dependencies and node\_modules.

### Removing Packages

#### Automatic (with pnpm remove)

* To remove a dependency:

  ```bash
  cd relevant-package
  pnpm remove <package-name>
  ```
* Both package.json, node\_modules, and pnpm-lock.yaml are cleaned automatically.

#### Manual (directly delete from package.json)

* If you deleted manually, then:

  ```bash
  pnpm install
  ```
* pnpm will automatically prune unnecessary files and dependencies.

#### Full Clean Up

* If needed (rare cases):

  ```bash
  rm -rf node_modules pnpm-lock.yaml
  pnpm install
  ```

---

## 3. How to Add a Workspace Package (e.g., Engine) to a Local Project

Below are two ways to add a package from your workspace (such as `game-engine`) into your game project:

---

### Add via Terminal Command

```bash
cd games/my-new-game
pnpm add game-engine --workspace
```

* This command adds the following to your project's package.json:

  ```json
  "dependencies": {
    "game-engine": "workspace:*"
  }
  ```
* The `workspace:*` tag tells pnpm to symlink the package locally from your workspace.
* You can then import and use it directly in your code:

  ```ts
  import { Game } from "game-engine";
  ```

---

### Manual Linking

* Add the following line manually to your project's package.json:

  ```json
  "dependencies": {
    "game-engine": "workspace:*"
  }
  ```
* Then, from the root directory (frontend/):

  ```bash
  pnpm install
  ```
* pnpm will automatically link the `game-engine` package locally.

---

> In both methods, workspace packages are instantly integrated for local development. If the package has peer dependencies, remember to add them to your main project's package.json as well!


## 4. Using peerDependencies in Workspace

### Defining Peer Dependency

* For example, in `game-engine`:

```json
{
  ...
  "peerDependencies": {
    "pixi.js": "^8.8.1",
    "gsap": "^3.12.7"
  }
}
```

* This means that the engine requires the specified package(s) to be installed in the parent project (like a game project).

### To add by the consumer (game):

```json
{
  "dependencies": {
    "game-engine": "workspace:*",
    "pixi.js": "^8.8.1"
  }
}
```

* If the same version is added, only one copy is installed.
* If a different version is added, pnpm may warn or throw an error.

### Using Peer and devDependency Together

* You can add a peer dependency as a devDependency in the engine as well, so the engine can be developed and tested standalone.

---

## 5. Importance of YAML and Workspace Files

* `pnpm-workspace.yaml` is the backbone of the workspace. If it’s missing, incomplete, or misnamed, monorepo features won’t work.
* It must always be at the project root and written correctly:

  ```yaml
  packages:
    - "game-engine"
    - "game-types/*"
    - "games/*"
  ```
* Directory names and patterns for sub-packages must match the file exactly.

---

## 6. FAQ & Troubleshooting

* **I deleted a dependency manually:**

  * Run `pnpm install` and it will clean up automatically.
* **Version conflict in multiple packages:**

  * Make sure to use the same version for the same dependencies.
* **pnpm-workspace.yaml is missing or incorrect:**

  * Workspace won’t work; check and fix the file.
* **Missing peer dependency:**

  * Project will warn or throw an error on startup; add the missing package.
* **node\_modules corrupted or too large:**

  * For a full clean up: `rm -rf node_modules pnpm-lock.yaml && pnpm install`

---

## 7. TL;DR Workflow

```bash
# 1. Clone the repo
# 2. Activate Corepack and pnpm
# 3. Run pnpm install in the root to install all dependencies
# 4. Enter the package you want to run and use: pnpm dev | pnpm run dev | npm run dev
# 5. If you run pnpm dev | pnpm run dev | npm run dev in the root, all projects will launch together. (This section can be further organized.)
# 6. Add/remove packages as needed, and run pnpm install to update node_modules if necessary
```

---

> For detailed questions, you can refer to this guide or contact @edleron.
