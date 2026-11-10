# Aegis Web 5.9.3 — Preview Windows + macOS

**Status:** Developer preview, NOT an official release. Latest stable Windows remains 5.9.2.

### Changes
- Includes the website Copy-button permission fix from 5.9.3 beta 1.
- Windows NSIS installer advertises **Aegis Web** under PDF **Open with...** without changing the default PDF application. Install this preview to register the option (running source with npm does not do this).
- Windows second-instance CLI PDFs and macOS Finder `open-file` events open the chosen local document directly in Aegis PDF Studio; the original file remains unchanged.
- PDF open requests are limited to existing local `.pdf` files with a maximum of 65 MiB and validated PDF headers.
- Includes CI scripts for an actual Electron macOS application package for **Intel (x64)** and **Apple Silicon (arm64)**, as DMG/ZIP, instead of the previous small non-standalone ZIP.

### Important known limitations
- macOS preview is **not signed or notarized**, so macOS Gatekeeper may block it. It must be tested on real Macs; no claim of a fully fixed macOS startup until verified.
- The PDF editor still downloads PDF.js and pdf-lib from public CDNs on first open. PDF rendering/editing requires Internet unless those dependencies are bundled in a subsequent improvement.
- The current in-app update installation path was developed for Windows; macOS downloads/install updates still need separate validation.
- Existing app preferences, local user data, and bookmarks are not intentionally cleared.
- This branch is only a **preview**; do not publish a stable 5.9.3 release until Windows/Mac smoke tests pass.

### Manual test checklist
1. Install Windows preview; right-click a PDF → **Open with** → choose **Aegis Web**. Confirm PDF Studio opens that PDF.
2. Repeat with Aegis Web already open; verify it receives a second file and does not launch a broken blank application.
3. Confirm the Windows default PDF app remains unchanged, and check uninstall removes the option.
4. Test site **Copy** buttons on secure HTTPS pages; confirm reading the clipboard is still not automatically permitted.
5. On Intel and Apple Silicon Macs, download preview zip/dmg, start app via Finder, and open PDF with Aegis Web. For unsigned/unnotarized builds, evaluate Gatekeeper prompts.
6. Confirm no startup blank screen, inspect startup logs if any failure, and verify PDF editor's optional Internet dependencies.
