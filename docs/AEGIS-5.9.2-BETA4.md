# Aegis Web 5.9.2-beta.4 — refonte Aegis Start, offres réelles et jeu réseau

**Statut : préversion pour tests. La dernière version stable 5.9.1 n'est pas remplacée.**

## Fonctionnalités

### 1. Aegis Start responsive

- Correction de l'horloge coupée et des éléments qui sortent de la fenêtre.
- Contenu défilable sur fenêtres basses ; grilles adaptatives sur les petites et grandes résolutions ; cartes et barres de recherche fluides.
- L'ancienne interface Arcade et le Chat communautaire ont été retirés de la préversion. Le mode Focus natif (F9) reste disponible.
- Tester en 1024×600, 1280×720, 1366×768, 1920×1080, 2560×1440 et zoom Windows 125–150 %.

### 2. Le vrai bon plan du jour

- La carte Aegis Start interroge des **sources de boutiques officielles** depuis le **processus principal Electron** (sans proxy public ni clé secrète intégrée).
- **Steam** : rubrique *specials* de la boutique Steam France, remise et prix réellement renvoyés par le magasin, en euros. Les remises sont rejetées si prix, pourcentage, devise ou échéance sont incohérents.
- **Epic Games** : promotions gratuites sur des jeux de base **déjà actives**, avec date de fin connue.
- Choix déterministe par date (fuseau Europe/Paris) entre les offres réelles disponibles. Rafraîchissement au maximum une fois par heure par processus ; les deux sources ont une requête simultanée limitée en taille/temps.
- Affiche le **titre exact**, le prix avant/après ou le caractère « Gratuit », le pourcentage et la boutique officielle. **Si aucune offre n'est vérifiable**, le panneau annonce cette indisponibilité au lieu d'inventer un prix ou une réduction.
- **Limite :** ces interfaces de boutiques ne sont pas des API publiques contractuelles. Elles peuvent changer, devenir indisponibles ou n'identifier aucune offre. Une offre vérifiée peut expirer entre l'affichage et l'ouverture.
- Les offres actives ne changent pas obligatoirement chaque jour s'il n'en existe qu'une.

### 3. Aegis Run automatiquement hors connexion

- Détection des interruptions réseau via l'événement `offline`, l'état de connexion Electron et un test HTTPS de connectivité. Deux échecs successifs sont nécessaires en cas de simple test HTTPS négatif pour réduire les faux positifs.
- Si la connexion est perdue, un mini-jeu **entièrement local** s'affiche automatiquement au-dessus de la navigation. Un utilisateur peut le fermer, puis réouvrir l'application sans réouverture intempestive pendant la même panne.
- Après reconnexion, le message change pour indiquer que le réseau est revenu.
- Les erreurs de chargement réseau gardent aussi le jeu sur la page d'erreur.
- **Touches corrigées** : Espace / ↑ = saut, ↓ = glissade, P = pause, clic/tactile pour sauter. Les touches fonctionnent après avoir cliqué sur Jouer.
- Lorsqu'une page charge depuis **12 secondes**, une notification non bloquante propose **Jouer en attendant**. Le site continue de charger en arrière-plan. Le jeu indique quand le chargement est terminé.
- **Limites :** un portail captif, un VPN restrictif ou un test HTTPS bloqué peuvent produire une détection imparfaite. Les tests de rendu et de reconnexion réels restent indispensables.

### 4. Contrôle parental natif (préversion)

- Paramètres > Contrôle parental : créer un PIN 4–16 chiffres, définir des limites quotidiennes et des domaines bloqués, débloquer 15 min ou désactiver.
- Empreinte **PBKDF2-SHA256 salée** stockée dans un fichier de politique distinct du magasin ordinaire de réglages ; validation PIN et compteur de temps dans le processus principal. Limitation des essais incorrects.
- Blocage des URL HTTP(S) dans le filtre réseau principal Electron, y compris les onglets privés. Les ressources locales de l'application ne sont jamais bloquées.
- **Important :** il s'agit d'un contrôle de navigation dans Aegis seulement, non d'un contrôle parental système Windows, et il ne résiste pas à une désinstallation, à un accès administrateur aux fichiers locaux ou à une modification du programme.
- Ni Aegis ni l'auteur du logiciel ne doivent présenter ce filtre comme une garantie absolue de protection d'enfants.

## Tests à effectuer

1. Exécuter `npm run lint:syntax` et `npm test`.
2. Installer uniquement sur un PC de test, conserver 5.9.1 pour l'utilisation quotidienne.
3. Sans Wi-Fi / sans réseau : le jeu doit s'ouvrir, les touches fonctionner et la reconnexion être signalée.
4. En charge lente (throttling réseau) : au-delà de 12 secondes, la proposition de jeu apparaît ; la page n'est pas annulée.
5. Aegis Start : tester différentes résolutions, langue FR/EN, zoom Windows et préférences de thèmes.
6. Promotion : tester une promo réellement active puis le cas où l'API Steam/Epic ne répond pas ; aucun prix ou pourcentage fictif.
7. Contrôle parental : PIN incorrect, délai de verrouillage après tentatives, blocage domaine et sous-domaines, 30 minutes de quota, réouverture, mode privé, déverrouillage 15 minutes.
8. Effectuer un audit de sécurité et des essais de régression avant une version stable.

## English summary

Preview-only update: responsive Aegis Start, **live validated storefront offers** (Steam France discounts and Epic Games free promotions), automatic offline runner and optional runner prompt after 12 seconds of slow page loading, and native PIN-backed Aegis-only parental controls. Removed Arcade and Chat. No guarantee of live offer availability, flawless Internet detection or tamper-resistant parental enforcement. Not yet approved for stable distribution.
