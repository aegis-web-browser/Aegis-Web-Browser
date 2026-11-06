# Aegis Web 5.9.2 — version officielle Windows

**Aegis Web 5.9.2 est la version stable Windows**, issue du code de la bêta 5. Elle remplace 5.9.1 comme dernière version officielle sur GitHub Releases.

## Changements depuis 5.9.1
- **Aegis Start** : correction de la page d'accueil qui restait affichée au-dessus des sites après navigation ; adaptation aux résolutions et fenêtres plus petites.
- **Bon plan du jour** : consultation des offres des boutiques Steam et Epic Games ; affichage d'une remise uniquement lorsque les données sont vérifiables. Les sources peuvent devenir indisponibles ; dans ce cas, aucun prix n'est inventé.
- **Aegis Run** : mini-jeu proposé automatiquement lorsque la connexion est perdue, ou après 12 secondes de chargement lent, sans interrompre la page. Touches Espace/↑, ↓ et P corrigées.
- **Contrôle parental expérimental** : code PIN, limite quotidienne de temps d'écran et sites bloqués. Cette protection s'applique à Aegis uniquement, pas à Windows ou aux autres navigateurs. Un administrateur du PC peut la contourner.
- **Focus** reste disponible. Les modules Arcade et Chat sont retirés de cette version.

## Télécharger
Télécharger **Aegis-Web-Setup-Windows.exe** ci-dessous pour Windows 10/11 x64.
Le fichier SHA256SUMS.txt permet de vérifier l'intégrité de l'installateur.

**Limites connues :** la compilation et les tests automatisés de cette version ont réussi. Les scénarios d'utilisation Windows (navigation, réseau lent, coupures, différentes résolutions) n'ont pas fait l'objet d'une validation manuelle exhaustive. Installateur non signé : SmartScreen peut afficher un avertissement. Conserver une sauvegarde de ses données avant mise à jour.

macOS reste en 5.8.5.1.

---

## English
**Official stable Windows 5.9.2**, promoted from beta 5: fixed Aegis Start persisting over web pages, responsive layout improvements, live verified Steam/Epic deal discovery, Aegis Run on network loss and slow loading, keyboard fixes, and experimental app-only parental controls. Arcade and Chat have been removed; Focus remains. Windows x64 unsigned installer. Automated checks passed; real-device regression coverage is limited. macOS remains on 5.8.5.1.
