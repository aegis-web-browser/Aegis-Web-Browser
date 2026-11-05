# Aegis Web 5.9.2-beta.3 — quatre fonctionnalités indépendantes

**Statut : préversion, non publiée comme version stable.** La 5.9.1 reste la dernière version stable. Cette branche est expérimentale et NE DOIT PAS servir de chat communautaire public sans validation et modération adaptées.

## 1. Aegis Start — Le bon plan du jour
- Une carte discrète apparaît directement sur **Aegis Start**, sous les actions rapides.
- Une destination officielle différente selon le jour : Epic Games, GOG, Steam, itch.io, GitHub.
- Il s'agit d'une **découverte quotidienne de sites de jeux ou de logiciels gratuits**, **pas** d'une véritable promotion ponctuelle vérifiée en direct.
- Pas de faux prix, pas de liens d'affiliation ni de connexion obligatoire.

## 2. Aegis Focus — outil distinct
- Bouton indépendant dans la barre du navigateur et accès depuis l'action Focus d'Aegis Start.
- Panneau latéral dédié avec minuteur de 15, 25, 45 ou 60 minutes, pause et remise à zéro.
- Le minuteur survit aux fermetures du panneau et se restaure localement après redémarrage dans les limites du stockage navigateur.
- Bouton d'activation du mode minimal existant (F9). Pas de promesse de blocage automatique des sites ou notifications.

## 3. Aegis Arcade — espace jeux indépendant
- Bouton dédié dans la barre du navigateur et entrée depuis Aegis Start.
- Memory (8 paires), Reflex (test de réaction), Aegis Run (runner d'obstacles déjà ajouté).
- Aucun serveur, aucune connexion, aucun compte nécessaires.

## 4. Aegis Chat — véritable interface de salons
- Fenêtre indépendante, liste de six salons : Général FR, General EN, Gaming FR, Gaming EN, Entraide FR, Help EN.
- L'utilisateur clique sur **Rejoindre** dans la liste. **Plus d'échange d'invitations manuelles**.
- Le navigateur utilise une **petite infrastructure de découverte et de signalisation WSS** pour établir automatiquement des canaux WebRTC entre participants. Les messages **ne transitent pas par ce service**, qui ne stocke aucune conversation. Topologie P2P maillée (8 participants maximum / salon).
- **Le service WSS n'est pas encore déployé** : le chat ne peut donc pas être rejoint sur Internet en l'état. La zone « Configuration avancée » permet d'enregistrer son adresse une fois déployé.
- Des réseaux restrictifs peuvent nécessiter TURN, qui n'est pas configuré. STUN tiers utilisé pour les candidats réseau et possibilité d'exposition de métadonnées / IP.

### Modération et sécurité : limites essentielles
- Le code de la messagerie ne traite que du **texte**, le schéma JSON est strict, les messages sont rendus avec `textContent`, jamais interprétés comme du HTML ou du JavaScript. Pas de pièces jointes ni de liens.
- Les règles lexicales FR/EN, les limites de taille et la **classification IA locale obligatoire à l'envoi ET à la réception** rejettent les messages inappropriés. **En l'absence du modèle Aegis AI local ou en cas d'erreur, tout message est bloqué** : aucune analyse des messages de chat n'est envoyée au modèle cloud configuré.
- Les filtres peuvent se tromper ou être contournés. Les clients modifiés, les identités non vérifiées, l'usurpation de pseudos et les abus restent possibles.
- **Il est impossible de garantir « zéro insultes / zéro pornographie » par un simple contrôle P2P côté client.** Pour des salons ouverts au public, en particulier accessibles à des mineurs, une infrastructure plus robuste est nécessaire : identité, anti-spam côté serveur, signalement, modération humaine / actions de bannissement, politique de conservation et procédure d'incidents. Le service de signalisation seul ne remplit pas ces exigences.
- Cette maquette ne doit pas être promue comme service communautaire public « sûr » avant audit de sécurité, tests avec deux machines et mise en place des protections précédentes.

## Déployer le prototype du service de salon pour tests privés

Dossier de service : `services/chat-signaling/`, avec `server.js` et `package.json`.

Sur Render (possible à titre d'essai en offre gratuite selon les conditions en vigueur) : créer un **Web Service** connecté au dépôt GitHub et choisir la branche `feature/aegis-hub-chat-focus-deals-arcade` ; Root Directory `services/chat-signaling`, Build Command `npm install`, Start Command `npm start`, Health Check `/health`. Après déploiement, recopier le domaine HTTPS attribué sous forme `wss://NOM.onrender.com` dans Aegis Chat > Configuration avancée. Ne pas inventer d'adresse avant attribution par Render.

**Limite Render Free :** mise en veille après 15 minutes sans trafic entrant ni message WebSocket, réveil pouvant prendre environ une minute et connexions interrompues lors des redémarrages. Insuffisant pour promettre un service communautaire disponible en permanence.

## Contrôles à faire avant toute publication
1. `npm run lint:syntax` et `npm test` pour le navigateur, `npm install` puis `npm test` dans `services/chat-signaling`.
2. Installer la préversion Windows sur une machine de test et vérifier visuellement chaque écran : **Start / Focus / Arcade / Chat**, en thème clair/sombre et largeur réduite.
3. Tester le serveur sur deux ordinateurs connectés, les changements de salon, la déconnexion, le nombre de participants et les cas de NAT complexe.
4. Sans modèle IA local, constater qu'aucun message n'est transmis. Avec le modèle installé, tester les textes FR/EN autorisés/interdits, les longues entrées, les scripts HTML/JS et le spam.
5. Audit avant tout accès public, et ne pas présenter ce prototype comme modération « infaillible ».

## English summary
Four **separate** Aegis Web features: daily official free-content discovery directly on Aegis Start, a standalone Focus timer, standalone offline Arcade, and a standalone P2P chat with a simple FR/EN room list and one-click join.

One-click join requires a separately deployed WSS signaling/discovery service. **No service is deployed by default**, so rooms are not connected yet. Chat messages travel via WebRTC DataChannels, not the signaling service. Strict local client-side filtering and local AI approval are mandatory both ways, but **cannot guarantee absolute content safety**. Not suitable as a production public community, especially for minors, before additional server-side safety and moderation measures.
