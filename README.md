# The Borderland Map

https://www.theborderland.se/map/

## Project Structure

This project consists of two separate applications:

* **map** → Vanilla JavaScript app (built with esbuild)
* **admin** → React + TypeScript app (built with Vite)

Both apps are managed using **npm workspaces** and are combined into a single static output in the `public/` folder.

```
apps/
  map/        # vanilla app
  admin/      # React app

public/       # final build output (deploy this)
```

---

## Available Commands

All commands are run from the project root.

### Install dependencies

```bash
npm install
```

This installs dependencies for all workspaces (`map` and `admin`).

---

### Development

```bash
npm run dev
```

This starts both apps using [concurrently](https://www.npmjs.com/package/concurrently):

* **Admin (React)** runs on Vite dev server
* **Map (vanilla)** rebuilds on file changes via esbuild (is served via proxy from Vite)

### Local URLs

* `/` → map app (proxied through Vite)
* `/admin` → React admin app

---
### Hot Reloading
* **Admin (React):** Full hot module replacement (HMR) via Vite — updates instantly without page reload
* **Map (vanilla):** Automatically rebuilds on changes (via esbuild `--watch`)

> Note: The map app does not use true hot reload — you may need to refresh the browser manually to see updates.
---

## Build for production

```bash
npm run build
```

This will:

1. Build the **map app** into `public/`
2. Build the **admin app** into `public/admin/`


### Output

All production assets are written to:

```
public/
  index.html        # map app + other files
  admin/            # React app
```

This folder can be deployed to any static hosting provider (e.g. GitHub Pages).

---

## Routing

The admin app is served under `/admin`.
* On prod its currently `/map/admin`
* On dev its just `/admin`

This is mapped in `vite.config.ts`

---

## Notes

* The `public/` folder should not contain source files — only build output
* Always run installs and scripts from the root (workspace-managed)
* The admin app uses Vite, which handles fast refresh and dev server features
* The map app uses esbuild for fast bundling

---


## QGIS tips & tricks
See [wiki](QGIS-tips-&-Tricks)