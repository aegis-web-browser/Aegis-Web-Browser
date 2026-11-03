# Aegis Web Browser · Navigateur de bureau / Desktop browser

> [!IMPORTANT]
> **🌐 NOUVELLE ADRESSE OFFICIELLE / NEW OFFICIAL WEBSITE**
>
> **FR — Le site d'Aegis Web a déménagé : https://aegis-web-browser.surge.sh/**
>
> L'ancienne adresse `https://aegis-web-browser.netlify.app/` peut encore être accessible, mais **elle n'est plus à jour et ne doit plus être utilisée comme site officiel**. Mettez vos favoris à jour.
>
> **EN — Aegis Web has moved to: https://aegis-web-browser.surge.sh/**
>
> The old Netlify URL may still load, but **it is no longer maintained or current**. Please update your bookmarks.

**Français** · [English](#english) · [Guide complet FR](docs/FEATURES.fr.md) · [Full English guide](docs/FEATURES.en.md)

Aegis Web est un navigateur de bureau basé sur **Electron / Chromium**, avec des outils intégrés pour la navigation, la confidentialité et la productivité.

Aegis Web is an **Electron / Chromium** desktop browser combining everyday browsing with integrated privacy and productivity tools.

**Version Windows / Windows release:** `5.9.0` · **macOS:** `5.8.5.1` · **Code source public / Public source** · [Télécharger / Download](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/latest)

---

## 📦 Dernière version / Latest release

**Windows 5.9.0** : [télécharger / download](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/tag/5.9.0) · [notes de version bilingues / bilingual release notes](RELEASE-NOTES-5.9.0.md)

**macOS 5.8.5.1** : [version précédente / previous version](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/tag/5.8.5.1). **Aucune version macOS 5.9.0 validée / No validated macOS 5.9.0 build.**

## 🇫🇷 Français

### Découvrir Aegis Web

Aegis Web réunit la navigation par onglets, la personnalisation de l'interface et plusieurs outils directement accessibles dans le navigateur :

| Fonction | Description |
|---|---|
| **Onglets et profils** | Groupes d'onglets, onglets épinglés, recherche et vue d'ensemble, profils séparés |
| **Aegis AdBlock** | Blocage de publicités et de certaines requêtes, avec listes de filtres |
| **Aegis Vault** | Coffre local de mots de passe avec chiffrement AES-256-GCM et dérivation scrypt |
| **Aegis AI** | Assistant IA avec service distant configurable et option locale de secours |
| **Aegis Translate** | Traduction de sélections et de pages |
| **Aegis PDF Studio** | Lire et annoter des PDF, pivoter/supprimer des pages et enregistrer une copie |
| **Aegis Cast** | Partager l'image d'un onglet sur le réseau local, sans son (ce n'est pas Chromecast) |
| **Outils de navigation** | Favoris, historique, téléchargements, mode lecture, notes, recherche et raccourcis |
| **Protection et réglages** | Options de confidentialité, accès VirusTotal, filtre de domaines facultatif et thèmes |
| **Mises à jour** | Recherche des nouvelles versions via GitHub Releases |

**📖 [Lire la présentation complète des fonctionnalités en français](docs/FEATURES.fr.md)** — détail des outils, de leurs limites et des données envoyées à des services externes.

### Télécharger et essayer le projet

Les versions Windows (5.9.0) et macOS (5.8.5.1) sont disponibles dans les [Releases GitHub](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/latest). Pour lancer **le code source** avec Node.js/npm :

```bash
npm install
npm start
```

Le `package.json` prévoit aussi `npm run build` pour produire un installateur Windows. **Une compilation reproductible identique aux exécutables distribués n'a pas encore été vérifiée.**

### Transparence et sécurité

Les fichiers de l'application ont été **récupérés depuis l'installateur Windows officiel 5.8.5.1**. Le code de l'installateur lui-même et le pipeline historique ne sont pas intégralement présents. Mettre le code en ligne facilite l'inspection, **mais ne garantit pas l'absence de virus**.

Lire : [Provenance et limites](SOURCE-STATUS.md) · [Politique de sécurité](SECURITY.md) · [Préparation open source](OPEN-SOURCE-README.md).

---

<a id="english"></a>

## 🇬🇧 English

### Meet Aegis Web

Aegis Web brings together tabbed browsing, interface customization and built-in features for privacy and productivity:

| Feature | Description |
|---|---|
| **Tabs and profiles** | Tab groups, pinned tabs, search and overview, separate user profiles |
| **Aegis AdBlock** | Ad and selected network-request blocking using filter lists |
| **Aegis Vault** | Local password vault using AES-256-GCM encryption and scrypt derivation |
| **Aegis AI** | Built-in assistant with a configurable cloud backend and optional local fallback |
| **Aegis Translate** | Translate selected text and page content |
| **Aegis PDF Studio** | Read and annotate PDFs, rotate/remove pages and save a copy |
| **Aegis Cast** | Share tab images on the local network without audio (not Chromecast) |
| **Browsing utilities** | Bookmarks, history, downloads, reader mode, notes and shortcuts |
| **Protection and settings** | Privacy options, VirusTotal integration, optional domain filtering and themes |
| **Updates** | New-version checks through GitHub Releases |

**📖 [Read the full English feature guide](docs/FEATURES.en.md)** — detailed behavior, limitations and important third-party data-sharing notes.

### Download and try the source

Windows (5.9.0) and macOS (5.8.5.1) downloads are available under [GitHub Releases](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/latest). To run **the source code** with Node.js/npm:

```bash
npm install
npm start
```

The `package.json` includes `npm run build` for a Windows installer. **Reproducible equivalence with the distributed binaries has not yet been established.**

### Source transparency and security

These application files were **recovered from the official Windows 5.8.5.1 installer**. The original installer implementation and complete historical build pipeline have not been recovered. Public code enables inspection, **but is not a malware-free guarantee**.

See: [Source provenance](SOURCE-STATUS.md) · [Security policy](SECURITY.md) · [Open-source notes](OPEN-SOURCE-README.md).

---

### Repository layout / Organisation des fichiers

| Path | Purpose / Rôle |
|---|---|
| [`main.js`](main.js) | Electron main process / processus principal |
| [`preload.js`](preload.js) | Interface bridge / communication avec l'interface |
| [`webview-preload.js`](webview-preload.js) | Embedded pages / pages intégrées |
| [`src/`](src/) | Browser UI and JavaScript / interface et interactions |
| [`build/`](build/) | Application icons / icônes |
| [`package.json`](package.json) | Dependencies and build scripts / dépendances et compilation |
| [`docs/`](docs/) | Full guides in French and English / guides complets |

**Licence / License:** the recovered `package.json` declares MIT; rights and third-party obligations still need confirmation before a definitive license statement for the full project.

**Soutenir / Support:** [Buy Me a Coffee — aegisweb](https://buymeacoffee.com/aegisweb).
