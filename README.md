# Aegis Web Browser

**Code source de l'application Aegis Web 5.8.5.1 accessible publiquement.**

Ce dépôt contient les fichiers Electron récupérés de l'installateur Windows officiel Aegis Web 5.8.5.1, avec une extraction sans exécution de l'installateur. L'empreinte SHA-256 du fichier utilisé a été vérifiée : `bfa41b02ab415e847ac0b71b62f1ef9c9839ef23afd343260c18d993f3d0308b`.

## Parcourir le code

- [main.js](main.js) — processus principal Electron
- [preload.js](preload.js) et [webview-preload.js](webview-preload.js) — passerelles vers l'interface
- [src/renderer.js](src/renderer.js) — logique et interactions
- [src/index.html](src/index.html) — interface du navigateur
- [src/style.css](src/style.css) — styles
- [package.json](package.json) — configuration et dépendances
- [build/](build/) — icônes

## Essayer de reconstruire le projet

Prérequis : Node.js et npm (version compatible avec Electron 44). Dans le répertoire du projet :

```bash
npm install
npm start
```

Sur Windows, le `package.json` définit aussi :

```bash
npm run build
```

**Ces commandes proviennent de la configuration récupérée. Une reconstruction complète et reproductible des exécutables officiels n'a pas encore été vérifiée.**

## Téléchargement

[Dernière Release](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/latest) — installateur Windows, archive macOS et vérification SHA-256.

## Transparence et sécurité

La publication du code permet son inspection, mais **ne prouve pas que les exécutables sont sans virus** ni qu'ils correspondent à une compilation reproductible de ce dépôt. Le code de l'installateur lui-même et l'ensemble du pipeline original de build ne sont pas récupérés.

- [État de l'audit / provenance](SOURCE-STATUS.md)
- [Signaler une vulnérabilité](SECURITY.md)
- [Notes de récupération du code](OPEN-SOURCE-README.md)

## Licence

Le `package.json` récupéré indique `MIT`, mais une vérification des droits et des licences des composants tiers reste nécessaire avant de considérer ce dépôt comme un projet open source entièrement licencié.

## Soutenir le projet

[Buy Me a Coffee — aegisweb](https://buymeacoffee.com/aegisweb)
