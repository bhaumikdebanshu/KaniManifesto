# Kani Home — working document

A static GitHub Pages website with an accordion chapter menu, searchable Markdown chapters, tables, printing and a combined Markdown download.

## Publish once

1. Create a public GitHub repository, for example `kani-home`.
2. Upload the contents of this folder to the repository root. Keep all files together.
3. In **Settings → Pages**, select **Deploy from a branch**, then **main** and **/(root)**. Save.
4. GitHub will show the website address after deployment completes.

No package installation, build command, paid hosting or backend is needed. The public-repository setup makes both the website and its source public. The search-engine noindex request does not make it private.

## Edit whenever you need

Open a chapter on the published website and select **Edit this chapter**. Edit its Markdown file on GitHub, preview the changes and commit. The site updates after GitHub Pages deploys the commit; refresh the website to see it.

Give trusted contributors repository write access to edit directly, or review their proposed changes in pull requests. This does not provide simultaneous document editing.

The chapter `.md` files are the working source. Change chapter names, descriptions, order and sidebar groups in `chapters.json`. If you add or rename a chapter, update that file too.

For a standard github.io address, edit links detect the repository automatically. For a custom domain, set `repository` in `site.json` to `OWNER/REPOSITORY`. Set `branch` to the actual publishing branch.

## Local preview

Opening `index.html` directly shows the included initial snapshot. To preview new Markdown edits accurately, serve this folder with any local static server (for example `python3 -m http.server 8000`) and open `http://localhost:8000`.

The earlier ChatGPT Page and Obsidian files do not automatically synchronise with this repository.

## Included dependency

Markdown rendering uses the vendored Marked library. Its licence is included in `marked-LICENSE.md`. No external scripts or analytics are loaded.
