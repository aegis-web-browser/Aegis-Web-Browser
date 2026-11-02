# Aegis Web — Guide complet (français)

[← Accueil du dépôt](../README.md) · [English guide](FEATURES.en.md) · [Dernière version](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/latest)

## Qu’est-ce qu’Aegis Web ?

**Aegis Web 5.8.5.1** est un navigateur de bureau construit avec **Electron**, utilisant le moteur web Chromium fourni par Electron. Il rassemble la navigation habituelle et plusieurs outils intégrés : gestion des onglets et des profils, blocage publicitaire, coffre de mots de passe, assistant IA, traduction, outils PDF et partage d’un onglet sur le réseau local.

Ce document décrit les fonctions **présentes dans le code récupéré de la version Windows 5.8.5.1**. Il ne constitue pas une certification de sécurité ni une garantie que chaque fonction opère parfaitement sur tous les systèmes.

## Navigation et organisation

- **Onglets :** création, fermeture et restauration, onglets épinglés, groupes d’onglets, recherche et vue d’ensemble.
- **Profils :** séparation des cookies, connexions, favoris, historiques, réglages et groupes d’onglets entre profils.
- **Navigation privée :** ouverture d’onglets privés ; elle ne rend pas anonyme sur Internet et n’équivaut pas à un VPN.
- **Favoris, historique, téléchargements :** gestion via l’interface et les menus dédiés.
- **Recherche :** barre d’adresse et moteur sélectionnable, notamment Google et DuckDuckGo.
- **Confort :** mode lecture, mode concentration, recherche dans la page, raccourcis clavier, palette de commandes, zoom et plein écran.
- **Personnalisation :** thèmes, densité de l’interface, page de démarrage et préférences de navigation.

## Protection et confidentialité

### Aegis AdBlock
Blocage des requêtes publicitaires et masquage de certains éléments, avec prise en charge d’une liste de filtres **EasyList**. L’utilisateur peut activer ou désactiver la protection et autoriser certains sites. **Aucun bloqueur ne garantit un filtrage intégral.**

### Aegis Vault
Coffre local de mots de passe. Le code utilise **AES-256-GCM** pour le chiffrement et **scrypt** pour dériver la clé du mot de passe principal. Le mot de passe principal ne doit pas être perdu : la récupération n’est pas garantie. Ce mécanisme a été repéré dans le code ; il n’a **pas fait l’objet d’un audit cryptographique indépendant**.

### Contrôles de sécurité
- Consultation d’informations sur la connexion et outils de protection.
- **VirusTotal :** accès aux rapports de liens/fichiers ; l’envoi automatique d’une URL à analyser requiert une clé API VirusTotal configurée.
- Filtre facultatif de domaines pour adultes, utilisant une liste locale pouvant être actualisée depuis le projet StevenBlack/hosts ; ce n’est **pas** une solution de contrôle parental garantie.
- Certains flux et listes de blocage sont téléchargés depuis des services externes.

## Aegis AI et traduction

### Aegis AI
Un assistant est intégré à l’interface. Le code prévoit la connexion à un **service IA distant configurable** et une option de solution locale de secours. Les fonctionnalités disponibles et leurs performances dépendent de la configuration, de la connectivité et des services employés. Lorsqu’un service distant est utilisé, des **questions et extraits de contenu pertinents peuvent lui être transmis**.

### Traduction
Traduction de texte sélectionné ou du contenu d’une page, et options de traduction de page. Le code utilise des **serveurs communautaires LibreTranslate** pour certaines demandes : **le texte envoyé à traduire quitte alors l’ordinateur**. Évitez d’y transmettre des informations confidentielles.

## Outils intégrés

### Aegis PDF Studio
Lecteur et outil d’annotation PDF : ajout de texte, surlignages et marques, rotation et suppression de pages, puis enregistrement d’**une nouvelle copie**. L’original n’est pas écrasé par défaut. L’affichage/édition avancés nécessitent un **premier chargement en ligne de PDF.js et pdf-lib**. L’outil n’est **pas** une solution de caviardage sécurisé.

### Aegis Cast
Partage de l’**image d’un onglet** auprès d’appareils sur le **même réseau local**, via une adresse fournie par Aegis. Le code annonce un rafraîchissement d’environ **une image par seconde, sans son**. Ce n’est **pas** le protocole Google Cast / Chromecast.

### Autres outils
Notes rapides locales, impression, raccourcis vers les pages et outils de consultation des téléchargements.

## Téléchargement et mises à jour

- **Windows :** installateur x64 disponible dans les [Releases](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/latest).
- **macOS :** archive distribuée sur la même page ; le processus macOS n’a pas été reconstruit et validé à partir des sources Windows publiées.
- Le système de mise à jour intégré consulte **GitHub Releases**. Les mécanismes d’intégrité sont documentés dans le code ; leur comportement en conditions réelles doit encore être audité.

Pour essayer le **code source** localement :

```bash
npm install
npm start
```

Pour tenter une compilation Windows, le `package.json` contient :

```bash
npm run build
```

Les sources récupérées déclarent Electron `44.9.3` et electron-builder `26.16.1`. **La génération de binaires identiques aux téléchargements officiels n’a pas été démontrée.**

## Repères dans le code

| Élément | Fichier |
|---|---|
| Processus principal, fenêtres, sessions, téléchargements et mises à jour | [`main.js`](../main.js) |
| Pont Electron avec l’interface | [`preload.js`](../preload.js) |
| Gestion des pages intégrées | [`webview-preload.js`](../webview-preload.js) |
| Interface du navigateur | [`src/index.html`](../src/index.html) |
| Interactions et réglages | [`src/renderer.js`](../src/renderer.js) |
| Styles visuels | [`src/style.css`](../src/style.css) |
| PDF Studio | [`src/pdf-studio.html`](../src/pdf-studio.html) et [`src/pdf-studio.js`](../src/pdf-studio.js) |
| Dépendances, scripts et paramètres de build | [`package.json`](../package.json) |

## Transparence, licences et sécurité

Les fichiers publiés ont été **récupérés statiquement de l’installateur Windows 5.8.5.1**, sans exécution de celui-ci. Le dépôt ne contient pas nécessairement toutes les sources de l’installateur ni la chaîne de compilation historique. Consultez [SOURCE-STATUS.md](../SOURCE-STATUS.md) et [SECURITY.md](../SECURITY.md).

La publication du code **ne garantit ni l’absence de virus ni la correspondance exacte des exécutables avec ce code**. Le champ `license` du `package.json` mentionne MIT, mais les droits et licences des composants doivent être confirmés avant de présenter le projet comme intégralement sous licence MIT.

**Soutenir le projet :** [Buy Me a Coffee](https://buymeacoffee.com/aegisweb).
