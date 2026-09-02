# Auction Draft Board

A 3-page site for tracking a live fantasy football auction draft:

- **Submit pick** (`index.html`) — search active Sleeper players, pick the drafting team, enter the amount, submit.
- **Auction log** (`auction-log.html`) — every pick, most recent first.
- **Team board** (`teams.html`) — budget/roster status per team; click a team to see their roster.

GitHub Pages only serves static files, so a Google Sheet (via Apps Script) acts as the shared database everyone's browser reads from and writes to. This works fine with several people submitting picks at once — the script queues writes one at a time.

## 1. Create the Google Sheet

1. Create a new Google Sheet.
2. Rename the first tab to **`Teams`**. In column A, starting at row 2, list your team names — one per row (e.g. `Seth`, `James`, `Team 3`, …). You can rename or add teams here at any time; the app reads this list fresh on every page load.
3. Add a second tab named exactly **`AuctionLog`**. In row 1, add these headers: `Timestamp`, `Player ID`, `Player Name`, `Player Team`, `Position`, `Team Drafted`, `Amount`. Leave the rest empty — the app fills it in.

## 2. Add the Apps Script backend

1. In the Sheet, go to **Extensions > Apps Script**.
2. Delete any starter code and paste in the contents of `Code.gs` from this folder.
3. Click **Deploy > New deployment**.
4. Click the gear icon next to "Select type" and choose **Web app**.
5. Set **Execute as** to "Me" and **Who has access** to "Anyone".
6. Click **Deploy**, authorize the script when prompted, and copy the **Web app URL** it gives you.

If you change the code later, use **Deploy > Manage deployments > Edit > New version** so the same URL keeps working.

## 3. Connect the front end

The three HTML pages don't talk to the Sheet directly — they all load `app.js`, which holds one shared setting (`CONFIG.APPS_SCRIPT_URL`) pointing at your Apps Script Web app. Setting it once here connects all three pages.

1. Open `app.js` in a text editor (or right in GitHub, using the pencil/edit icon on the file).
2. Near the top, find this block:

   ```js
   const CONFIG = {
     APPS_SCRIPT_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
     ...
   };
   ```

3. Replace the placeholder string with the Web app URL you copied at the end of step 2. It should look like `https://script.google.com/macros/s/XXXXXXXX/exec` — keep the quotes around it:

   ```js
   const CONFIG = {
     APPS_SCRIPT_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
     ...
   };
   ```

4. Save the file. If you're editing on GitHub directly, commit the change to `main` (or `master`) so Pages picks it up.
5. To check it worked: open `teams.html` (or its live GitHub Pages URL) in a browser. The setup banner ("This board isn't connected to a Google Sheet yet…") should be gone, and the table should show your team names from the `Teams` tab — even with $0 spent and no picks yet. If you still see the banner, double check the URL was pasted inside the quotes with no extra spaces, and that the Apps Script deployment's access is set to "Anyone."

## 4. Publish to GitHub Pages

1. Create a new GitHub repo and add all the files in this folder (`index.html`, `auction-log.html`, `teams.html`, `styles.css`, `app.js`) — you don't need to upload `Code.gs`, that lives in Apps Script.
2. In the repo, go to **Settings > Pages**, set the source branch to `main` (or `master`) and the folder to `/ (root)`.
3. GitHub gives you a URL like `https://yourname.github.io/your-repo/` — that's the live site.

## How the numbers are calculated

- **Starting budget** and **roster size** are fixed at $250 and 15 spots per team (edit `STARTING_BUDGET` / `ROSTER_SIZE` at the top of `Code.gs` if that ever changes).
- **Remaining** = Starting − Spent.
- **Spots left** = 15 − players drafted.
- **Max bid** = Remaining − (Spots left − 1). This reserves $1 for every other open roster spot, so it always leaves enough to fill the roster.

## Notes

- The Sleeper player list is fetched once and cached in the browser for 12 hours (trimmed to just name/team/position/rank, so it's a small download), then re-fetched automatically.
- A player already logged as drafted disappears from the Submit pick dropdown for everyone the next time they load or refresh that page.
- Team defenses show as "City D/ST" (e.g. "Detroit D/ST").
