# Altaïr — landing page scrollytelling (concept)

Concept de portfolio **non officiel** autour du parfum Altaïr de Parfums de Marly.
Aucun logo ni visuel de la marque : le flacon, les lumières, les étoiles et le grain sont entièrement générés en code.

## Stack

- `index.html`, `style.css`, `main.js` : aucun build
- [Three.js](https://threejs.org/) 0.169.0 (import map, jsDelivr) : flacon en géométrie, verre `MeshPhysicalMaterial` + transmission, envmap `RoomEnvironment`, champ d'étoiles en shader
- [GSAP](https://gsap.com/) 3.12.5 + ScrollTrigger (cdnjs) : récit au scroll, pins, défilement horizontal
- [Lenis](https://lenis.darkroom.engineering/) 1.1.13 (unpkg) : smooth scroll

## Lancer en local

Le JS utilise des modules ES : il faut un petit serveur HTTP (l'ouverture directe en `file://` ne fonctionne pas).

```bash
# au choix
npx serve .
# ou
python3 -m http.server 8000
```

Puis ouvrir http://localhost:3000 (serve) ou http://localhost:8000 (Python). Une connexion internet est nécessaire pour les CDN et Google Fonts.

## Structure du récit

1. **Hero** : « ALTAÏR » se révèle lettre par lettre, le flacon émerge de l'ombre
2. **L'étoile** : inspiration, constellation de l'Aigle tracée au scroll, parallaxe des étoiles
3. **Les notes** : tête, cœur, fond, chacune avec sa couleur d'ambiance (lumières 3D + lueur CSS)
4. **Le flacon** : section épinglée, rotation puis zoom sur le bouchon
5. **Sillage** : défilement horizontal de citations et d'ambiances
6. **CTA** : « Découvrir Altaïr », bouton magnétique avec glow

## Accessibilité et performance

- `prefers-reduced-motion` : pas de smooth scroll, pas de pin ni de scrub, contenu visible d'emblée, scène 3D rendue à la demande
- Mobile : pixel ratio limité à 1,5, environ trois fois moins de particules, géométrie allégée, pas d'antialiasing
- Desktop : pixel ratio limité à 2 ; rendu suspendu quand l'onglet est masqué
- HTML sémantique, lien d'évitement, focus visible, contrastes AA, canvas décoratif masqué aux lecteurs d'écran
- Si WebGL est indisponible ou qu'un CDN ne répond pas, la page reste lisible

## Personnaliser

- Poses du flacon par chapitre : objet `KF` dans `main.js`
- Couleurs d'ambiance des notes : attribut `data-amb` des `<article class="note">`
- Palette : variables CSS en tête de `style.css`
- Lien du CTA : `href` du bouton `.btn-glow` dans `index.html`
