# Aegis Web 5.9.3-beta.1 — correction des boutons « Copier »

## Problème
Depuis Aegis Web 5.9.2, des boutons « Copier » présents sur des sites HTTPS ne fonctionnent pas, notamment ceux qui utilisent `navigator.clipboard.writeText(...)`.

**Cause identifiée dans le code** : `configureSilentPermissions` refusait toutes les permissions à l'exception du mode plein écran, dont `clipboard-sanitized-write` requis par Chromium/Electron pour le presse-papiers.

## Correctif
- Autorise `clipboard-sanitized-write` depuis les pages **HTTPS** contenues dans les vues Web isolées d'Aegis (et `http://localhost` pour les tests locaux).
- Configure **les deux** gestionnaires Electron : `setPermissionCheckHandler` et `setPermissionRequestHandler`.
- **N'autorise pas `clipboard-read`** : aucun site n'acquiert automatiquement le droit de lire le presse-papiers.
- Ne permet pas à un site HTTP non sécurisé, une URL `file://` ou à l'interface interne Aegis de bénéficier d'une permission arbitraire.
- Les interactions normales du navigateur (clic, clavier, sélection, Ctrl+C) et la copie interne Aegis restent inchangées.
- Ajoute des tests unitaires ciblés de la politique.

## Vérification manuelle Windows recommandée
1. Installe la **préversion** sur une machine de test.
2. Ouvre une page HTTPS proposant un bloc de code avec bouton Copier (GitHub, documentation technique, etc.).
3. Clique sur Copier et colle le résultat dans le Bloc-notes Windows avec `Ctrl+V`.
4. Vérifie aussi la copie de texte sélectionné avec `Ctrl+C`, l'utilisation du presse-papiers en navigation privée et sur différents sites HTTPS.
5. Vérifie qu'une page ne peut pas lire automatiquement le presse-papiers avec `navigator.clipboard.readText()`. Le correctif ne doit pas autoriser cette lecture.
6. Vérifie que les sites HTTP non sécurisés restent limités par les règles de sécurité Chromium, et qu'aucune autre permission sensible n'a été ouverte.

**Limites :** ce correctif vise les sites utilisant la Clipboard API standard. Certains boutons personnalisés peuvent rester cassés pour d'autres raisons (site, extension, iframe, JavaScript, contexte HTTP non sécurisé). Aucun test d'interface Windows réelle n'a encore été effectué.

## English
Allows secure websites in Aegis Web guest webviews to use Chromium's `clipboard-sanitized-write` permission so common Copy buttons can write to the system clipboard. Clipboard **reading** remains denied. Strict origin checks and tests added. Preview only; not yet a stable public update.
