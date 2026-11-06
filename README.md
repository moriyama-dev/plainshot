# Plainshot

Capture an entire web page as a single image, in one click.

Plainshot takes the whole page — not just what fits on screen — and saves it
straight to your downloads folder. Nothing is uploaded, nothing is tracked, and
the extension makes no network requests of any kind.

Works in Microsoft Edge and Google Chrome (version 116 or newer) on Windows,
macOS and Linux.

## Install

Plainshot is not in the Edge Add-ons or Chrome Web Store yet. Until it is,
install it from GitHub as an unpacked extension. Once it is in a store, the
browser will keep it up to date by itself.

### The easy way (Windows, macOS and Ubuntu)

1. Download `plainshot.zip` from the
   [latest release](https://github.com/moriyama-dev/plainshot/releases/latest).
2. Unzip it into a folder that you will keep, for example `plainshot` in your
   home folder.
   - **Windows:** right-click the file → **Extract All...**
   - **macOS:** double-click the file in Finder.
   - **Ubuntu:** right-click the file in Files → **Extract**.
3. Open `edge://extensions` (Edge) or `chrome://extensions` (Chrome).
4. Turn on **Developer mode**, click **Load unpacked** and choose the folder.
5. Pin the Plainshot button to the toolbar from the extensions (puzzle piece)
   menu.

Leave the folder where it is: the browser loads Plainshot from it every time it
starts.

### Install or update with one command

These commands download the latest release into the `plainshot` folder in your
home folder. Run the same command again to update, then click **Reload** on
the Plainshot card in `edge://extensions` or `chrome://extensions`. The folder
stays the same, so your keyboard shortcut is kept.

macOS and Ubuntu (Terminal):

```sh
curl -fsSL -o /tmp/plainshot.zip https://github.com/moriyama-dev/plainshot/releases/latest/download/plainshot.zip && rm -rf ~/plainshot && mkdir ~/plainshot && unzip -q /tmp/plainshot.zip -d ~/plainshot
```

On Ubuntu, install `unzip` first if the command is missing:
`sudo apt install unzip`.

Windows (PowerShell):

```powershell
Invoke-WebRequest https://github.com/moriyama-dev/plainshot/releases/latest/download/plainshot.zip -OutFile "$env:TEMP\plainshot.zip"; Remove-Item "$HOME\plainshot" -Recurse -Force -ErrorAction SilentlyContinue; Expand-Archive "$env:TEMP\plainshot.zip" "$HOME\plainshot"
```

The first time, load the folder with **Load unpacked** as in step 4 above.

To hear about new versions, click **Watch → Custom → Releases** on this
repository. Each release also has the file under a versioned name,
`plainshot-<version>.zip`.

## How it works

Plainshot captures in one pass through the browser's own rendering pipeline, so
there are no stitching seams and fixed headers appear exactly once. While it
does this, the browser shows a short "started debugging this browser" notice;
that is the browser being transparent about the single-pass capture, and it
goes away as soon as the image is taken.

On pages taller than 16,384 pixels, or when DevTools is open on the tab, it
falls back to scrolling and stitching automatically. In that mode elements
fixed to the screen can appear more than once.

Before capturing, it walks the page once so that lazily loaded images have a
chance to appear in the result.

## Usage

Click the toolbar button, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>.
The image is written to `Downloads/plainshot/` as a PNG named after the site
and the time, for example `example.com-20261106-142530.png`.

The badge on the button shows progress: `...` while capturing, `OK` when the
file is saved, and `!` if the page cannot be captured. Browser pages such as
`chrome://` and `edge://` and the extension stores do not allow capture.

To change the shortcut, open `edge://extensions/shortcuts` or
`chrome://extensions/shortcuts`.

## Feedback

Right-click the toolbar button:

- **Report a problem** opens a new GitHub issue with the Plainshot version,
  browser, OS and language already filled in. The address of the page you were
  on is never included. Nothing is sent until you submit the form yourself.
- **GitHub** opens this repository.

## Privacy

Plainshot collects no data and makes no network requests. See
[PRIVACY.md](PRIVACY.md).

## Permissions

| Permission     | Why it is needed                                                 |
| -------------- | ---------------------------------------------------------------- |
| `activeTab`    | Read the tab you invoked Plainshot on, and nothing else          |
| `scripting`    | Measure and scroll the page while capturing                      |
| `debugger`     | Render the full page in a single pass                            |
| `downloads`    | Save the finished image                                          |
| `contextMenus` | Add "Report a problem" and "GitHub" to the toolbar button's menu |

There are no host permissions, so Plainshot has no standing access to any site.

## Building from source

Requires Node.js 22.18 or newer.

```bash
npm ci
npm run build
```

The unpacked extension is written to `dist/`. To load it, open `edge://extensions`
(or `chrome://extensions`), turn on developer mode, and choose **Load unpacked**.

```bash
npm run typecheck   # TypeScript, strict mode
npm run lint        # ESLint
npm test            # unit tests
npm run zip         # release/plainshot-<version>.zip, ready for the stores
```

### End-to-end test

`npm run e2e` loads `dist/` into a real Chrome, clicks the toolbar button on a
local test page, and checks that a full-height PNG is saved — once through the
single-pass path and once through the scrolling fallback. It needs
[Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/):

```bash
npx @puppeteer/browsers install chrome@stable --path .cache/browsers
CHROME_PATH=/path/printed/above npm run e2e
```

On Ubuntu 23.10 and newer, AppArmor blocks Chrome's sandbox; set
`E2E_NO_SANDBOX=1` to run the test there. The test only opens a page served
from `127.0.0.1`.

The same test runs on macOS in GitHub Actions
([macos-test.yml](.github/workflows/macos-test.yml)) before each release.

## License

MIT
