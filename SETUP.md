# Classroom Display — setting up your own

This guide takes you from nothing to a working classroom TV display in about 30 minutes. Nothing in it depends on the original author's accounts: you'll end up with your own sheet, your own write-back script, and (optionally) your own hosted page.

**What you get**

- A TV page that switches by itself: class content a few minutes before each class, a cleanup checklist with countdown for the last stretch, shop-wide info in between.
- Everything driven by one Google Sheet that any teacher in the room can edit from a phone.
- Check-offs and write-ins on the screen that flow back into the sheet.
- Two Claude skills: one to feed content in (from voice notes, email, calendar), one to manage schedules without teachers stepping on each other.

**What you need**

- A Google account (for the sheet and the Apps Script).
- A TV or monitor with any device that runs a browser (a Chromebox, a Raspberry Pi, an old laptop, a smart TV browser).
- Optional: a GitHub account and a Netlify account if you want to host your own copy of the page. If another room already hosts one, you can use theirs with your own sheet (step 4, option A).

---

## 1. Make your sheet

1. Open the template sheet you were given and choose **File → Make a copy**. Name it for your room, e.g. `Classroom Display – Room 12`.
2. In your copy, clean out anything that belonged to the previous room:
   - **Settings** tab: clear the **Write-back URL** value (you'll make your own in step 3). Delete any rows named `Teacher: …` — those are per-teacher set-up markers. Change **Display Title** and **Subtitle** to your room/school.
   - **Classes** tab: delete the existing class rows. Keep the header row.
   - **Tasks, Due Dates, Safety Rules, Cleanup, Groups, Shop Info**: delete rows that don't apply to you. Rows containing `SAMPLE` are placeholders. Rows with `All` in the Class column are meant to be shared and are usually worth keeping (the safety basics, the cleanup checklist).
   - Do **not** rename tabs or change row 1 of any tab — the page and the skills find things by those names.
3. **Share → General access → Anyone with the link.**
   - **Viewer** is enough for the TV to read it. Teachers who edit the sheet get edit access by being added by email, or by setting the link to **Editor** if you'd rather not manage names. Editor-by-link means anyone who sees the TV page's source can also edit; decide what's right for your room.
4. Copy the sheet's ID from its URL: `https://docs.google.com/spreadsheets/d/`**`THIS-PART`**`/edit`. You'll use it in steps 3 and 4.

The **How To Use** tab inside the sheet documents every column.

## 2. Add your classes

In the **Classes** tab, one row per class:

| Column | What goes there |
|---|---|
| Class | The name shown on screen. Content rows refer to it exactly. |
| Days | `Wed`, `Mon, Wed`, `MWF`, `Weekdays`, `Daily` |
| Start Time / End Time | `3:00 PM` style |
| Room, Teacher | Optional, shown under the title. Teacher is what other teachers see in overlap warnings. |
| Color | Hex code, e.g. `#F5A524`. The screen's accent color for that class. |
| Active | Checkbox. Unchecked rows are ignored. |
| Show Due Dates | Checkbox. Uncheck for a class that doesn't use due dates and the panel disappears. |
| Dates | Optional specific dates (`10/17/2026, 11/7/2026`) for one-off sessions, with or without Days. |

The screen shows **one class at a time**. If two overlap, the one that starts earlier is shown for the whole overlap. The `configure-classroom-display` skill checks for this before writing.

## 3. Turn on write-back (optional but recommended)

Without this step, checks and write-ins on the TV stay on that TV's computer and reset nightly. With it, they land in the sheet.

1. In your sheet: **Extensions → Apps Script**. A new project opens.
2. Delete everything in `Code.gs` and paste in the contents of `Code.gs` from this repository. **File → Save** (or Ctrl/Cmd+S).
3. **Deploy → New deployment → gear icon → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then **Authorize access**. Google will warn that the app isn't verified — it's your own script; click **Advanced → Go to (project name)** → **Allow**.
4. Copy the **Web app URL** and paste it into the sheet's **Settings → Write-back URL**.
5. Open that URL once in a browser. You should see `{"ok":true,...}`.

If you ever edit the script: **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The URL stays the same.

The script can only do three things to your sheet: add a row, set the Done columns, delete a row that the screen itself created. It cannot read or change anything else.

## 4. Get the page on the TV

### Option A — use an existing hosted copy (no hosting needed)

If another room already has the page hosted (any URL ending in `.netlify.app` or wherever they put it), open it with your sheet's ID:

```
https://THEIR-HOSTED-PAGE/?sheet=YOUR_SHEET_ID
```

That's it. The page reads *your* sheet. Nothing about your room is visible to them, and their updates to the page code benefit you automatically.

### Option B — host your own

1. Put these files in a GitHub repository (fork this one, or create a new repo and upload `index.html`, `Code.gs`, `netlify.toml`, `README.md`, `SETUP.md`).
2. In `index.html`, find the line near the top of the script:
   ```
   const DEFAULT_SHEET = '...';
   ```
   and put your sheet's ID between the quotes. (Or leave it and always use `?sheet=` in the URL.)
3. Sign in to Netlify → **Add new project → Import an existing project → GitHub** → pick the repo. Build command: leave empty. Publish directory: `.` (the included `netlify.toml` already says this). Deploy.
4. If Netlify created the site as *Private*, open the project and click **Make public**.
5. Your page is at `https://YOUR-SITE-NAME.netlify.app`. Any push to the repo's main branch redeploys it.

No Netlify? Any static host works (GitHub Pages, Cloudflare Pages, a school web server) — it's a single HTML file with no build step.

### On the TV

Open the page full-screen in a browser (F11, or a kiosk mode). The page:

- re-reads the sheet every 60 seconds (Settings → Refresh Every),
- reloads itself fully every 6 hours to pick up code updates,
- shows an "offline" badge and keeps the last good data if the network drops.

If the TV has a mouse or touch, items on the Tasks and Cleanup panels can be tapped to check them off, and **+ Add item** adds one. A keyboard (physical or on-screen) is needed to type.

Test any time of day with URL parameters: `?demo=1` (sample data), `&now=2026-10-14T18:35` (pretend time), `&class=My%20Class` (force a class).

## 5. Install the skills (optional)

The `skills/` folder holds two Claude skills. Each file has placeholders in `<ANGLE BRACKETS>` at the top — fill them in before adding the skill to Claude:

| Placeholder | Put |
|---|---|
| `<SHEET_URL>` and `<SHEET_ID>` | your sheet's link and ID |
| `<DISPLAY_URL>` | the page URL from step 4 |
| `<ADMIN_NAME>` and `<ADMIN_EMAIL>` | whoever maintains the display for your room — tickets go there |

- **update-classroom-display** — a teacher says "update the display" and it pulls tasks, due dates, announcements and groups from their Plaud notes, Gmail or Google Calendar into the sheet, showing them a numbered list to approve first.
- **configure-classroom-display** — takes a schedule (Excel, PDF, email, a sentence) and writes Classes rows; runs a first-time setup per teacher; checks every change against other teachers' classes and spells out any overlap and what the screen would do; queues problems into one ticket email to the admin, with the teacher describing what they want the display to do.

Each teacher adds the skills to their own Claude. Their Claude needs the Google Sheets connector, and Gmail / Calendar / Plaud for whichever sources they use.

## 6. Adding another teacher to the same room

They don't need anything new: same sheet, same page. They add their class rows (or run `configure-classroom-display`, which does first-run setup and overlap checks), tag their content rows with their class name, and use `All` for anything the whole room shares.

## Troubleshooting

| Symptom | Check |
|---|---|
| Page says it can't load the sheet | Sharing is "Anyone with the link"; the ID in the URL / `DEFAULT_SHEET` is right; tab names are unchanged. |
| A class never appears | Classes row: Active checked, Days/Dates spelled as above, times with AM/PM. |
| Content doesn't show for a class | The Class column on the content row matches the Classes name exactly, or is `All`; Show is checked. |
| Check-offs don't reach the sheet | Settings → Write-back URL filled in; opening that URL shows `{"ok":true}`; the deployment's access is **Anyone**. |
| Write-ins land far down the tab | You're on an old `Code.gs` — redeploy the current one as a new version. |
| Text too small / too big on the TV | Settings → Text Size (%). |
