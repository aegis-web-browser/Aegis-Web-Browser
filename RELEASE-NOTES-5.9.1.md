# Aegis Web 5.9.1 — Correctif VirusTotal / VirusTotal fix

## 🇫🇷 Français

**Aegis Web 5.9.1** corrige le bouton **VT** du centre de téléchargements sur Windows.

### Correctifs

- Le bouton ne redirige plus automatiquement vers un rapport VirusTotal inexistant.
- Le SHA-256 du fichier est calculé localement. Avec une clé API VirusTotal configurée, Aegis vérifie si un rapport existe avant de l'ouvrir.
- Si VirusTotal ne connaît pas le fichier, Aegis l'indique explicitement au lieu d'afficher « Item not found ».
- Avec une clé API, vous pouvez **confirmer l'envoi du fichier pour analyse**. Aucun fichier n'est transmis sans confirmation. Les fichiers envoyés à VirusTotal peuvent être accessibles à sa communauté et à ses partenaires.
- Sans clé API, Aegis ouvre la page d'import manuel VirusTotal. Le fichier n'est pas envoyé par Aegis.
- Les dossiers ne sont pas directement pris en charge par VirusTotal ; Aegis affiche désormais un message explicite. Vous pouvez préparer vous-même une archive ZIP, en vérifiant qu'elle ne contient aucun document privé.
- Messages d'erreur compréhensibles pour les clés API invalides et les quotas atteints.
- Dépôts via HTTPS ; fichiers volumineux (> 32 Mo) pris en charge avec l'URL d'envoi dédiée, dans la limite autorisée par VirusTotal.
- Le déménagement du site officiel vers **https://aegis-web-browser.surge.sh/** est également pris en compte dans le code source de ce correctif. Si ce site est inaccessible, la recherche de mises à jour se replie sur le dépôt GitHub officiel.

**Important :** une absence de détection ne garantit jamais la sécurité d'un fichier. Les fichiers téléchargés ne sont **pas** automatiquement envoyés à VirusTotal. Une validation automatisée du code et de la compilation Windows ne remplace pas un test manuel de toutes les étapes avec une vraie clé API VirusTotal.

**Téléchargement :** Windows x64. Installeur non signé numériquement (Windows SmartScreen peut afficher un avertissement).
**macOS :** la dernière version publiée et disponible reste [5.8.5.1](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/tag/5.8.5.1).

## 🇬🇧 English

**Aegis Web 5.9.1** fixes the **VT** button in the Windows download manager.

- File SHA-256 is calculated locally and, when a VirusTotal API key is configured, the report's existence is verified before opening.
- Unknown files display a clear status instead of an incorrect “Item not found” page.
- Unknown files can be submitted **only after explicit consent**, using the VirusTotal API key. Uploaded samples may be shared with VirusTotal's community and partners.
- Without a key, Aegis opens VirusTotal's manual upload page; it does not upload files itself.
- Folders are not directly supported, with an explanatory message.
- Better authentication, rate-limit, and HTTPS upload handling, including large-file uploads.
- The in-app update bootstrap now uses the new Surge website and can fall back to the official GitHub repository.

**Note:** No detection is not proof of safety. The installer is unsigned and has not been independently audited. Automated code/build checks do not replace manual testing with a real VirusTotal account.

**Platform:** Windows x64. **macOS:** [5.8.5.1](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/tag/5.8.5.1) remains available.

Official website: https://aegis-web-browser.surge.sh/
Repository: https://github.com/aegis-web-browser/Aegis-Web-Browser
