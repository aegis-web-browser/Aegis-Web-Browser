# Aegis Web 5.9.0 — Feuille de route / Roadmap

> **En développement, non publié. / In development, not released.** La dernière version stable distribuée reste 5.8.5.1. Ce document propose des objectifs et des critères de validation, pas des fonctionnalités déjà livrées.

## Objectif

Construire un navigateur **fiable, performant, respectueux des données et vérifiable**. D'abord consolider le socle, ensuite ajouter des fonctionnalités. Garder les profils, favoris, sessions et données locales des utilisateurs existants.

## P0 — Sécurité et fiabilité (priorité bloquante)

- [x] Refuser le téléchargement de mises à jour sans SHA-256 valide et les URL HTTP ; ajouter des tests unitaires (sur la branche de développement).
- [x] Préparer la migration corrective vers Electron **44.10.1** ; la compilation et l'exécution restent à vérifier.
- [x] Ajouter les vérifications de syntaxe et tests Node automatisés dans GitHub Actions.
- [ ] Vérifier **tous les canaux IPC** : seules les fenêtres autorisées doivent pouvoir invoquer les opérations privilégiées.
- [ ] Auditer les WebViews, popups, liens externes et permissions selon la checklist de sécurité Electron.
- [ ] Vérifier que les téléchargements, hashes et installations GitHub résistent aux échecs réseau et qu'une mise à jour corrompue ne s'exécute jamais.
- [ ] Tester le retour arrière après échec, la migration de 5.8.5.1 et la conservation des **favoris, profils, historique, sessions et Aegis Vault**.
- [ ] Générer et valider un `package-lock.json`, passer à `npm ci` pour la reproductibilité et examiner les dépendances.

**Validation P0 :** tests automatiques au vert ; navigateur démarrant sous Windows ; navigation HTTPS ; aucune perte des données lors d'une mise à jour ; échec sécurisé si une mise à jour n'a pas d'empreinte vérifiable.

## P1 — Performances et expérience utilisateur

- [ ] Mesurer les temps de démarrage, la mémoire et la réactivité avant les optimisations.
- [ ] Optimiser les onglets inactifs, sans perdre les formulaires ni interrompre les téléchargements.
- [ ] Créer **Aegis Workspaces**, reposant sur les groupes d'onglets et profils existants.
- [ ] Améliorer le gestionnaire de téléchargements : état, progression, erreurs, reprise lorsque le serveur la prend en charge.
- [ ] Rendre plus lisibles les erreurs et les mécanismes de récupération après un plantage d'onglet.

**Validation P1 :** régressions d'onglets et profils absentes ; résultats de performance mesurés et publiés, pas de promesses non vérifiées.

## P2 — Aegis AI 2.0 et confidentialité

- [ ] Résumer la page active uniquement sur demande explicite.
- [ ] Poser des questions sur une page et comparer plusieurs onglets avec références aux contenus.
- [ ] Afficher clairement ce qui est envoyé à un backend IA ou à un service de traduction.
- [ ] Permettre de désactiver ces transferts et distinguer le traitement local du traitement distant.
- [ ] Construire un tableau de bord de confidentialité par site : permissions, blocages et exceptions.

**Validation P2 :** consentement explicite ; désactivation effective ; aucune lecture ou transmission implicite de contenus privés.

## P3 — Compilation, provenance et distribution

- [ ] Valider les builds d'aperçu Windows sur GitHub Actions et documenter chaque dépendance.
- [ ] Ajouter vérifications des artefacts, signatures Windows et signature/notarisation macOS lorsque les certificats sont disponibles.
- [ ] Tester Windows 10/11 et macOS Intel/Apple Silicon avant de revendiquer une compatibilité.
- [ ] Publier sommes SHA-256, notes de version bilingues et attestations de provenance.
- [ ] Publier 5.9.0 uniquement après validation de la liste de contrôle de sortie.

## Ordre de développement

1. **5.9.0-dev** : correctifs de sécurité, CI et tests.
2. **5.9.0-beta** : fonctions ergonomiques, compilation et tests utilisateurs.
3. **5.9.0-rc** : migration, mises à jour, restauration et vérification de la distribution.
4. **5.9.0** : sortie stable seulement après vérification.

Aucun calendrier de sortie n'est fixé avant les résultats techniques.

## Restrictions importantes

Les fichiers publiés proviennent de l'application intégrée à l'installateur Windows **5.8.5.1** ; la chaîne de compilation historique n'a pas été entièrement reconstituée. Une empreinte SHA-256 GitHub **ne remplace pas** une signature indépendante et la publication du code **ne garantit pas** l'absence de malware. Aegis Cast n'est pas le protocole Chromecast. Les services IA/traduction distants peuvent recevoir du contenu selon leur configuration.

## English summary

**Aegis Web 5.9.0 is planned, not released.** The roadmap prioritizes secure updates, IPC and WebView auditing, automated tests, migration safety, and a staged Electron patch update (P0). Performance measurements, workspaces and download UX follow (P1). Explicit, privacy-aware page assistance and site-specific privacy controls come next (P2). Reproducible packaging, verified artifacts and signed Windows/macOS releases are release goals (P3).

**Release gate:** no stable release until Windows/macOS builds are checked, upgrades preserve user data, and update verification fails safely.
