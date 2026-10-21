# Altaïr — landing page scrollytelling (concept)

Concept de portfolio **non officiel** autour du parfum Altaïr de Parfums de Marly.
La page met en scène trois photos du produit (dossier `assets/`) dans une scène WebGL : fondus « braise » entre les vues, zooms cadrés sur chaque ingrédient, masque en arche, bouchon détouré qui se détache en 3D. Les étoiles, la poussière dorée et le grain sont générés en code.

## Stack

- `index.html`, `style.css`, `main.js` : aucun build
- [Three.js](https://threejs.org/) 0.169.0 (import map, jsDelivr) : photos affichées sur des plans avec un shader maison (fondu au bruit avec liseré de braise, zoom/focus, arche, reflet, ondulation à la vitesse de scroll), champ d'étoiles en shader
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

1. **Hero** : l'arche se lève sur la photo d'ambiance, « ALTAÏR » se révèle lettre par lettre
2. **L'étoile** : zoom sur le flacon, constellation de l'Aigle tracée au scroll, parallaxe des étoiles
3. **Les notes** : fondu vers la photo des ingrédients, recadrée sur la cannelle (tête), la vanille (cœur), les bois (fond), avec une couleur d'ambiance par note
4. **Le flacon** : section épinglée sur la photo détourée : la matière, le relief, puis le bouchon qui se détache
5. **Sillage** : défilement horizontal de citations, la photo d'ambiance glisse en arrière-plan
6. **CTA** : le flacon revient se poser, bouton magnétique avec glow

## Photos

| Fichier | Usage |
| --- | --- |
| `assets/altair-ambiance.webp` | hero, l'étoile, sillage |
| `assets/altair-ingredients.webp` | les notes |
| `assets/altair-corps.webp` + `assets/altair-bouchon.webp` | flacon détouré, bouchon séparé |
| `assets/altair-flacon.webp` | version complète (repli sans WebGL) |

Les photos d'origine étaient en basse définition (447 et 540 px) : elles ont été agrandies à environ 1 000 px puis compressées en WebP (moins de 350 Ko au total). Des photos plus grandes (1 600 px ou plus) rendront les zooms plus nets : il suffit de remplacer les fichiers en gardant les mêmes noms. Si le bouchon change de place dans la photo détourée, mettre à jour `CAP` dans `main.js`.

## Accessibilité et performance

- `prefers-reduced-motion` : pas de smooth scroll, pas de pin ni de scrub, contenu visible d'emblée, la scène change de vue sans animation
- Mobile : pixel ratio limité à 1,5, environ trois fois moins de particules, pas d'antialiasing
- Desktop : pixel ratio limité à 2 ; rendu suspendu quand l'onglet est masqué
- HTML sémantique, lien d'évitement, focus visible, contrastes AA ; chaque photo a un `<img>` avec texte alternatif (lu par les lecteurs d'écran, affiché si WebGL est indisponible)
- Si WebGL est indisponible ou qu'un CDN ne répond pas, la page reste lisible avec les photos

## Personnaliser

- Cadrages et positions par chapitre : objet `KF` dans `main.js` (`az`/`afx`/`afy` = zoom et point de focus dans la photo)
- Couleurs d'ambiance des notes : attribut `data-amb` des `<article class="note">`
- Palette : variables CSS en tête de `style.css`
- Lien du CTA : `href` du bouton `.btn-glow` dans `index.html`
