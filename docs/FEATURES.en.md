# Aegis Web — Full feature guide (English)

[← Repository home](../README.md) · [Guide en français](FEATURES.fr.md) · [Latest release](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/latest)

## What is Aegis Web?

**Aegis Web 5.8.5.1** is a desktop browser built using **Electron**, which embeds Chromium's web engine. It combines standard browsing features with integrated tab and profile management, ad blocking, a password vault, an AI assistant, translation, PDF tools and local-network tab sharing.

This guide describes features **found in the application files recovered from the Windows 5.8.5.1 installer**. It is not a security certification or a guarantee that all functions work on every supported device.

## Browsing and organization

- **Tabs:** create, close and restore tabs; pin tabs, create groups, search tabs and use the tab overview.
- **Profiles:** separate cookies, signed-in sessions, bookmarks, browsing history, settings and tab groups.
- **Private tabs:** private browsing is available, but **does not make you anonymous online** or act as a VPN.
- **Bookmarks, history and downloads:** dedicated panels and menu actions.
- **Search:** address bar with configurable search engine, including Google and DuckDuckGo.
- **Productivity:** reader mode, focus mode, find in page, shortcuts, command palette, zoom and fullscreen.
- **Customization:** visual themes, interface density, start page and browser preferences.

## Protection and privacy

### Aegis AdBlock
Network request blocking and some cosmetic hiding, using filter lists including **EasyList**. Users can toggle blocking and allow individual sites. **No ad blocker can guarantee that every ad or tracker is blocked.**

### Aegis Vault
A local password vault. The code uses **AES-256-GCM** encryption and **scrypt** key derivation from a master password. Losing the master password can mean losing access to the vault. The implementation has been inspected at a basic source level but **has not undergone an independent cryptographic audit**.

### Security controls
- Connection information and protection controls.
- **VirusTotal:** access to URL/file reports; automatically submitting URLs for analysis requires a configured VirusTotal API key.
- Optional adult-domain filter based on a local list refreshed from StevenBlack/hosts; **not a guaranteed parental-control system**.
- Some blocklists and security data are downloaded from external providers.

## Aegis AI and translation

### Aegis AI
An AI assistant is included in the interface. The code provides for a **configurable remote AI backend** and an optional local fallback. Availability and results depend on service configuration, network connectivity and local resources. When using a remote service, **prompts and relevant excerpts may be sent to that service**.

### Translation
Tools for translating selected text or page content. Some requests use **community LibreTranslate servers**: text submitted for translation **is sent outside your computer**. Do not submit confidential data unless you trust the service.

## Integrated tools

### Aegis PDF Studio
Open PDFs and add text, highlights and other marks; rotate or delete pages and save a **new PDF copy**. The original is not overwritten by default. Advanced viewing/editing needs an **initial online load of PDF.js and pdf-lib**. This is **not a secure redaction tool**.

### Aegis Cast
Shares the **image of a tab** with a device on the **same local network**, using an address shown by Aegis. The implementation describes approximately **one image per second, without audio**. It **does not implement the Google Cast / Chromecast receiver protocol**.

### More utilities
Local quick notes, printing, page shortcuts and download controls.

## Downloads and updates

- **Windows:** x64 installer in [GitHub Releases](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/latest).
- **macOS:** a download is available in Releases, but the macOS package has not been independently reconstructed and validated from the published Windows application sources.
- The built-in updater checks **GitHub Releases**. Integrity-related logic is present in the code, but end-to-end security verification remains outstanding.

To try running the **source** locally:

```bash
npm install
npm start
```

The recovered `package.json` also declares a Windows build command:

```bash
npm run build
```

Declared development dependencies are Electron `44.9.3` and electron-builder `26.16.1`. **A reproducible build matching the officially distributed binaries has not been established.**

## Source code map

| Area | File |
|---|---|
| Electron main process, windows, sessions, downloads and updates | [`main.js`](../main.js) |
| Secure communication bridge | [`preload.js`](../preload.js) |
| Embedded web page integration | [`webview-preload.js`](../webview-preload.js) |
| Main user interface | [`src/index.html`](../src/index.html) |
| UI interactions and settings | [`src/renderer.js`](../src/renderer.js) |
| Interface styling | [`src/style.css`](../src/style.css) |
| PDF Studio | [`src/pdf-studio.html`](../src/pdf-studio.html) and [`src/pdf-studio.js`](../src/pdf-studio.js) |
| Dependencies and Windows packaging configuration | [`package.json`](../package.json) |

## Source provenance, licensing and security

The published files were **statically recovered from the Windows 5.8.5.1 installer**, without running it. They may not include the original installer implementation or historical build pipeline. Read [SOURCE-STATUS.md](../SOURCE-STATUS.md) and [SECURITY.md](../SECURITY.md) for important limitations.

Publishing source code **does not prove that binaries are malware-free or reproducibly built from it**. The recovered `package.json` lists MIT as its license, but project rights and third-party license obligations must be confirmed before treating the entire repository as definitively MIT-licensed.

**Support development:** [Buy Me a Coffee](https://buymeacoffee.com/aegisweb).
