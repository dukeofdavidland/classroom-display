# Classroom Display

A full-screen page for a classroom TV. It reads a Google Sheet and switches what it shows based on the class schedule:

- **Before / during class** – Today's Tasks, Safety Rules (and Due Dates, if the class uses them)
- **Last 30 minutes** – Cleanup checklist with a countdown, plus group assignments
- **Between classes** – Shop Info

Items on the Tasks and Cleanup panels can be checked off or added on the screen; with the write-back script installed those changes land in the sheet.

## Files

| File | What it is |
|---|---|
| `index.html` | The display page. Self-contained, no build step. |
| `Code.gs` | Google Apps Script to paste into the sheet (Extensions → Apps Script) so screen changes write back. Setup steps are in the file header and in the sheet's *How To Use* tab. |
| `netlify.toml` | Publishes this folder as-is; `no-cache` so the TV picks up new deploys on its next reload. |

## URL options

| Parameter | Effect |
|---|---|
| `?sheet=<id>` | Use a different sheet (for another class / teacher). Default is the BCT A sheet. |
| `?demo=1` | Built-in sample data, no sheet needed |
| `&now=2026-10-14T18:35` | Pretend it is that time (for testing views) |
| `&class=BCT%20A` | Force a class on-screen regardless of schedule |

## Sheet

The sheet must be shared as **Anyone with the link → Viewer**. Tabs and columns are documented on its *How To Use* tab. Settings on the sheet control minutes-before-class, cleanup window, refresh rate, text size, and the write-back URL.

## Deploying

Hosted on Netlify; pushes to `main` deploy automatically once the repo is connected. Manual: `netlify deploy --prod`.
