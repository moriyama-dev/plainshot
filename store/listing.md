# Store listing

Text and answers for the Chrome Web Store and Microsoft Edge Add-ons
submissions. Upload `release/plainshot-<version>.zip` (from `npm run zip`) and
the images in `store/images/` (from `npm run store-images`).

- Name: from the package (`Plainshot — Full Page Screenshot`)
- Category: Productivity (Chrome: Workflow & Planning / Tools; Edge: Productivity)
- Language: English (also ships a Japanese UI)
- Homepage / support URL: https://github.com/moriyama-dev/plainshot
- Privacy policy URL: https://github.com/moriyama-dev/plainshot/blob/main/PRIVACY.md

## Short description (≤ 132 characters)

Comes from `extDescription` in `public/_locales/*/messages.json`:

> Capture an entire web page as a single image in one click. Fast, seamless, and fully offline.

## Detailed description — English

```text
Plainshot saves the whole web page — not just what fits on your screen — as one PNG image, with a single click.

• One click, or Alt+Shift+P
• Seamless: the page is rendered in a single pass, so there are no stitching lines and sticky headers appear once
• Handles very long pages by scrolling and stitching automatically
• Loads lazy images before capturing, so pictures further down the page are not blank
• Saves straight to Downloads/plainshot/, named after the site and the time

Private by design
• No account, no upload, no cloud
• No analytics, no tracking, no network requests of any kind
• Only touches the tab you click it on — no access to any other site

While capturing, the browser briefly shows a "started debugging this browser" notice. That is the browser telling you Plainshot is using its built-in renderer to draw the full page; it closes as soon as the image is saved.

Open source (MIT): https://github.com/moriyama-dev/plainshot
Right-click the toolbar button for "Report a problem".
```

## Detailed description — Japanese

```text
Plainshot は、ウェブページ全体（画面に見えていない下の部分まで）を、ワンクリックで1枚の PNG 画像として保存します。

• ワンクリック、または Alt+Shift+P
• 継ぎ目なし：ページを1回で描画するので、つなぎ目の線が出ず、固定ヘッダーも1回だけ写ります
• とても長いページは、自動でスクロールしながら撮ってつなぎます
• 撮る前に遅れて読み込まれる画像を読み込むので、下の方の画像が空白になりません
• ダウンロード/plainshot/ に、サイト名と日時の名前で直接保存します

プライバシー
• アカウント不要、アップロードなし、クラウドなし
• 分析・追跡・通信は一切ありません
• 触るのはクリックしたタブだけ。ほかのサイトにはアクセスしません

撮影中、ブラウザに「デバッグを開始しました」という通知が一瞬表示されます。ページ全体を描画するためにブラウザ内蔵の仕組みを使っていることを、ブラウザが知らせているものです。画像を保存すると消えます。

オープンソース（MIT）：https://github.com/moriyama-dev/plainshot
ツールバーのボタンを右クリックすると「問題を報告」があります。
```

## Single purpose (Chrome)

> Plainshot captures the current web page in full, top to bottom, and saves it as one image file.

## Permission justifications

| Permission     | Justification                                                                                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`    | Gives temporary access to the one tab the user clicked the button (or pressed the shortcut) on. Used instead of host permissions so the extension never has standing access to any site.                                                                               |
| `scripting`    | Injects small functions into that tab only when the user starts a capture, to measure the page height, scroll through it so lazily loaded images appear, and restore the scroll position afterwards.                                                                   |
| `debugger`     | Calls the DevTools protocol command `Page.captureScreenshot` with `captureBeyondViewport` on the active tab, which renders the entire page in one pass with no seams. The debugger is attached only for the duration of a capture and detached immediately afterwards. |
| `downloads`    | Saves the finished image to the user's Downloads folder.                                                                                                                                                                                                               |
| `contextMenus` | Adds "Report a problem" and "GitHub" to the toolbar button's right-click menu.                                                                                                                                                                                         |

- Host permissions: none.
- Remote code: **No**, I am not using remote code. All JavaScript is in the package.

## Data usage (Chrome privacy practices tab)

- Collected data: none of the categories (tick nothing).
- Certify all three: not sold to third parties; not used for unrelated
  purposes; not used for creditworthiness or lending.

## Edge Add-ons

- Same zip, description, privacy policy URL and images.
- "Does your extension access, collect or transmit personal information?": **No**.
- Notes for certification:

```text
No account or test credentials are needed. Open any web page, click the Plainshot toolbar button (or press Alt+Shift+P), and a PNG of the full page is saved to Downloads/plainshot/. The "debugger" permission is used only for Page.captureScreenshot with captureBeyondViewport during a capture, and is detached right after. Source code: https://github.com/moriyama-dev/plainshot
```

## Before each submission

1. Bump `version` in `package.json` (the build copies it into the manifest).
2. Run the macOS test workflow on GitHub and wait for it to pass.
3. `npm run build && npm run zip`, then upload the zip.
