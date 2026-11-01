## Edit a chapter

1. Open the chapter you want to change.
2. Click **Edit this chapter** in the top bar. It opens the corresponding Markdown file on GitHub.
3. Sign in to GitHub and make your changes. Headings use `##`; tables use rows separated by vertical bars.
4. Use GitHub’s Preview tab to check the text and table formatting.
5. Select **Commit changes**, add a short description, and save to the publishing branch if you have permission.
6. Wait for the Pages deployment to complete, then refresh this website.

The editor link appears once the site is hosted on GitHub Pages, or when the repository is set in `site.json`.

## Let someone else contribute

Share the website link for reading. Give selected collaborators repository write access if they should edit directly. Others can propose changes through GitHub pull requests. This is repository editing, not simultaneous Google Docs-style editing.

## Tables and checklists

The site displays tables and checklists from the Markdown files. Make changes in the source file through **Edit this chapter**. Checkboxes on the reading page are intentionally read-only; use `- [x]` in the source to mark a decision complete.

## Download or print

**Download Markdown** combines the current chapters into a single editable document. **Print all** prepares every chapter for printing or saving to PDF.

## One working source

After publishing, the Markdown files in this GitHub repository are the website’s working source. The earlier ChatGPT Page and Obsidian folder do not automatically synchronise with it.

## Visibility

The free public-repository setup makes the site and its source public. The site requests that search engines do not index it, but this is not access control. Anyone with the address can read it.

## Versions and charts

Use [Version history & feedback](#version-history) for substantive changes. The main website is the current working edition; the linked snapshots preserve earlier editions and should not be edited. Use **Print all** on a snapshot to save that edition as a PDF.

Platform charts are written as indented bullet lists inside a `kani-chart` code block in each platform’s Markdown file. Indentation defines the project hierarchy. The matching responsibilities table explains each role; shared support is listed separately beneath the chart. Update both when a reporting relationship changes.

Before publishing a substantive new edition, update the version and date in `site.json`, the history page and the preserved snapshot together. Follow the [Document review checklist](#document-plan).
