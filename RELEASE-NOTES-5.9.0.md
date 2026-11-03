# Aegis Web 5.9.0 — Windows stable / Version Windows stable

## 🇫🇷 Français

**Aegis Web 5.9.0** est la version stable Windows issue des tests de la bêta 5.9.0. Cette version consolide la sécurité des mises à jour GitHub et les contrôles automatisés.

### Nouveautés
- Mises à jour Windows : téléchargement exclusivement en HTTPS, y compris en cas de redirection.
- Blocage des mises à jour dont le fichier GitHub n'a pas d'empreinte SHA-256 valide.
- Meilleure comparaison des numéros de versions stables et de préversions.
- Mise à niveau corrective vers **Electron 44.10.1**.
- Tests automatisés du code et de l'installation Windows via GitHub Actions.
- Toutes les fonctionnalités existantes (navigation, profils, Aegis Vault, AdBlock, Aegis AI, PDF Studio, Aegis Cast) restent présentes.

**Plateforme :** Windows x64. L'installateur est généré à partir du dépôt GitHub. Il n'est **pas signé numériquement** et peut déclencher un avertissement SmartScreen. Une compilation et un test utilisateur ne constituent pas une certification antivirus. Les nouvelles fonctions IA ou espaces de travail décrites dans la feuille de route ne font pas partie de cette livraison.

**macOS :** la version distribuée reste [5.8.5.1](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/tag/5.8.5.1). Aucune version 5.9.0 macOS testée n'est publiée ici.

**Intégrité :** vérifier `SHA256SUMS.txt` après téléchargement de `Aegis-Web-Setup-Windows.exe`.

## 🇬🇧 English

**Aegis Web 5.9.0** is the tested Windows stable promotion from beta 5.9.0. The release focuses on safer GitHub-based updates and automated build checks.

### What's new
- Windows update downloads require HTTPS, including after redirects.
- Updates are rejected when the GitHub Release asset lacks a valid SHA-256 digest.
- Improved release version comparison for stable and prerelease versions.
- Electron patched to **44.10.1**.
- Automated code checks and Windows packaging on GitHub Actions.
- Existing browser features remain included.

**Platform:** Windows x64. The installer is built from the public GitHub repository. It is **not code signed**, so Windows SmartScreen may show a warning. Neither a successful build nor a user test proves the software is malware-free. Planned AI and workspace features are not included in this release.

**macOS:** [5.8.5.1](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/tag/5.8.5.1) remains the available version; 5.9.0 has not been validated for macOS.

**Integrity:** compare the downloaded installer against `SHA256SUMS.txt`.

Source: https://github.com/aegis-web-browser/Aegis-Web-Browser
