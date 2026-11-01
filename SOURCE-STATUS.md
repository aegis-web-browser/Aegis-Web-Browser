# Aegis Web 5.8.5.1 — source publication status

The Windows installer was inspected without launching it. Its bundled application payload contained `main.js`, `preload.js`, `webview-preload.js`, `pdf-preload.js`, the `src/` UI files, build icons and `package.json`.

**Review performed:** JavaScript syntax check with Node.js v22.16.0, scan for several common hardcoded secret patterns, and inspection of Electron settings and update code.

**Not yet verified:** A reproducible Windows installer build, runtime behavior, a complete dependency security audit, the origin of every external download, and binary/source equivalence.

**Important:** These source files are recovered application files, not necessarily the complete original development project. The NSIS installer source and original build pipeline were not recovered.

**Release download:** https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/tag/5.8.5.1
