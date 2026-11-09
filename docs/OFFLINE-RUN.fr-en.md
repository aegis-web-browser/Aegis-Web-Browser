# Aegis Run — mini-jeu hors connexion / Offline mini-game

**Statut / Status : 5.9.2-beta.1 — aperçu non publié comme version stable / preview, not a stable release.**

## Français

Aegis Run est un jeu original intégré à l'écran d'erreur réseau d'Aegis Web. Il s'affiche lorsqu'un onglet ne peut pas charger une page en raison d'un problème réseau : aucune connexion supplémentaire ni compte requis.

- **Espace ou ↑** : saut
- **↓** : glisser / se baisser (éviter les drones)
- **P** : pause / reprise
- **Entrée** : démarrer ou rejouer
- **Souris / tactile** : cliquer sur le terrain pour sauter ; bouton Glisser maintenu pour se baisser
- Éviter les pics au sol et les drones, collecter les étoiles (+20 points), améliorer son record.
- Score, niveau et vitesse augmentent au fil de la partie.
- **Record local seulement** (non envoyé à un serveur). Le mode privé ne conserve pas le record.
- Le jeu se met en pause en changeant d'onglet ou quand l'application est masquée. Il ne masque jamais les boutons « Réessayer » et « Accueil ».
- Le jeu ne s'affiche pas pour les erreurs non réseau, et ne remplace pas l'écran d'accueil normal.

### Vérification recommandée

1. Installer la **préversion** sur une machine de test ; éviter d'écraser une installation de travail sans sauvegarde.
2. Couper le Wi-Fi puis tenter de charger une page HTTP(S) dans un onglet.
3. Vérifier que la page d'erreur et Aegis Run apparaissent ; tester saut, glissade, pause, collision, relance.
4. Changer d'onglet, revenir, puis rétablir Internet et cliquer « Réessayer ».
5. Vérifier qu'une erreur de certificat ne présente pas Aegis Run.
6. Tester un thème clair/sombre, un écran étroit, et un profil privé.

**Limites :** les tests unitaires valident le moteur de jeu ; une session sur l'application Windows reste nécessaire pour vérifier l'affichage réel et les événements réseau de Chromium.

## English

Aegis Run is an original offline runner built into the Aegis Web network error page. Jump over floor spikes, duck under drones, collect stars, and beat your locally stored high score. Controls: **Space/Up** jump, **Down** duck, **P** pause, **Enter** start/restart, plus mouse/touch buttons.

It requires no Internet, login, telemetry, or external assets. High scores stay local; private mode does not persist records. The game pauses when hidden or when switching tabs. Network-related failures trigger it, not certificate errors or normal navigation cancellations.

**Preview build only** until the Windows runtime and disconnection/reconnection tests are completed.
