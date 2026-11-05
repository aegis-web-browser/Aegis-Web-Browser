# Aegis Hub — 5.9.2-beta.2 (FR / EN)

**Statut : préversion expérimentale**, non publiée comme version stable. Le code et l'installateur Windows doivent être testés avant toute mise en production. La version stable GitHub reste 5.9.1.

## Fonctionnalités / Features

### Aegis Focus
- Minuteur local pour sessions de 15, 25, 45 ou 60 minutes, pause et reprise.
- Temps restant conservé localement ; bouton d'activation du mode minimal existant (F9).
- Ne prétend pas bloquer les sites ni les notifications système.

### Le bon plan du jour / Daily discovery
- Rotation quotidienne entre **destinations officielles** (Epic Games, Steam, GOG, itch.io, GitHub).
- **Il ne s'agit pas d'un flux de promotions vérifiées en temps réel.** Pas de prix inventé, pas d'affiliation.
- L'utilisateur consulte lui-même l'offre active et les conditions de la plateforme.

### Aegis Arcade
- Memory 4×4, 8 paires et compteur de coups.
- Reflex avec mesure du temps de réaction et record local.
- Aegis Run (runner original issu de la fonctionnalité hors-ligne) accessible depuis Arcade.
- Les jeux fonctionnent sans Internet et sans ressources tierces.

### Aegis Chat P2P FR / EN
- Six **salons logiques privés** : Général/General, Gaming et Entraide/Help.
- WebRTC DataChannels (transport chiffré par WebRTC). Aucune infrastructure de messagerie, de découverte publique ni de stockage serveur.
- **Signalisation manuelle indispensable** : l'hôte crée un code d'invitation, l'invité le colle et renvoie une réponse, l'hôte confirme. Refaire cet échange pour chaque nouveau participant (jusqu'à 5 invités connectés directement à l'hôte ; ce dernier relaie les messages validés aux autres participants).
- **Le salon dépend de son hôte** : les messages des invités sont redistribués par le navigateur de l'hôte, sans serveur central. Les invités n'ont pas de lien direct entre eux. Si l'hôte se déconnecte, le salon s'arrête. Les pseudos ne sont pas des identités certifiées.
- Aucune garantie de connectivité Internet : en NAT/firewall restrictif, un **relais TURN** peut être nécessaire. STUN facultatif avec consentement explicite, et des adresses IP/métadonnées réseau peuvent être révélées.
- **Filtres stricts sur chaque message envoyé et reçu :** validation des types et tailles, schéma JSON fermé, interdiction des URL, HTML, balisage et pièces jointes, blocage lexical FR/EN des insultes et termes explicites, limitation de débit, puis classification par le **moteur Aegis AI installé localement**. Les messages sont refusés si l'IA est absente, indisponible ou donne un résultat ambigu (fail-closed). **Aucun texte de chat n'est transmis à l'IA cloud configurée dans Aegis AI.**
- Les messages sont ajoutés à l'interface via `textContent` et ne sont jamais traités comme HTML/Markdown/JavaScript ; pas de chargement d'images/fichiers ni d'exécution du contenu reçu.
- Historique limité en mémoire volatile (pas de stockage persistant). Suppression locale de la connexion d'un participant.
- **Aucune promesse de sécurité absolue :** aucun modèle d'IA ni liste de mots interdits n'est infaillible ; les faux négatifs, faux positifs et contournements restent possibles. Les pairs peuvent utiliser des versions modifiées du client. Des salons publics, la modération centralisée, les signalements et la sécurité des mineurs exigent une architecture et une équipe de modération supplémentaires. Ne pas ouvrir les salons au public en l'état.

## Essais indispensables avant publication
1. Contrôler `npm run lint:syntax` puis `npm test`.
2. Installer la préversion Windows **sur un environnement de test** et vérifier démarrage, fermeture et profils.
3. Deux machines : échanger les codes offre/réponse dans Général FR et General EN ; activer STUN volontairement si nécessaire.
4. Vérifier que l'absence d'Aegis AI installé entraîne le refus du message sortant et du message entrant, sans ouverture à un traitement cloud.
5. Installer le modèle local et tester les filtres FR/EN sur des messages ordinaires, injurieux, explicites, des URL et des chaînes HTML/JS, puis tester spam et réponses corrompues.
6. Vérifier Focus sur des pauses/relances, Arcade hors ligne, jeu Aegis Run depuis Arcade et l'écran d'erreur réseau.
7. Valider l'UI en français et en anglais, les écrans étroits et l'accessibilité clavier.

## English
Preview-only Aegis Hub with offline Focus timer, curated **official free-offer discovery** (not a live verified deal feed), two offline arcade mini-games plus Aegis Run, and **manual-invite, private WebRTC room chat**.

Chat enforces text-only, schema and size validation, rate-limiting, local FR/EN content filters and mandatory on-device Aegis AI moderation on both incoming and outgoing messages. It fails closed when the local AI is unavailable. The chat never uses the configured cloud AI endpoint. There is no central message server, so public room discovery is unavailable; peer-to-peer connections may still require optional STUN/TURN infrastructure. No content filter is perfect and this is not yet a suitable public community chat for minors.
