# Altaïr — landing page scrollytelling (concept)

Concept de portfolio **non officiel** autour du parfum Altaïr de Parfums de Marly.
La page est construite autour d'un film produit : la vidéo est découpée en 145 images, puis rejouée sur un canvas au rythme du scroll. Le coffret s'ouvre, le capot s'envole, le flacon se démonte pièce par pièce pendant que le récit se déroule à côté.

## Stack

- `index.html`, `style.css`, `main.js` : aucun build
- Canvas 2D : séquence d'images (`frames/`), fondu entre deux images voisines, bords prolongés et adoucis pour que le film se fonde dans la page
- [GSAP](https://gsap.com/) 3.12.5 + ScrollTrigger (cdnjs) : ouverture en cercle, entrées de section, compteurs, zones de couleur
- [Lenis](https://lenis.darkroom.engineering/) 1.1.13 (unpkg) : smooth scroll
- Polices Google : Bodoni Moda (titres), Instrument Sans (texte), DM Mono (repères)

## Lancer en local

Il faut un petit serveur HTTP pour charger les images du film :

```bash
# au choix
npx serve .
# ou
python3 -m http.server 8000
```

Puis ouvrir http://localhost:3000 (serve) ou http://localhost:8000 (Python). Une connexion internet est nécessaire pour les CDN et Google Fonts.

## Structure du récit

| Moment | Chapitre | Film | Mise en page | Entrée |
| --- | --- | --- | --- | --- |
| Hero | ALTAÏR | ciel étoilé, constellation de l'Aigle, puis le film s'ouvre en cercle | centré | lettres qui montent |
| 2–11 % | 001 L'étoile | flacon et coffret | texte à gauche | glissé depuis la gauche |
| 12,5–20 % | 002 L'écrin | le coffret s'ouvre | texte à droite | glissé depuis la droite |
| 21,5–31 % | 003 Le geste | le capot s'envole, le flacon bascule | texte à gauche | rotation |
| 33–49 % | 004 Anatomie | vue éclatée | texte à droite, liste qui s'allume pièce par pièce | rideau (clip) |
| 51–65,5 % | 005–007 Notes | calque cognac, marquee géant | gauche / droite / gauche | fondu, zoom, glissé |
| 67–77 % | 008 Repères | calque nuit étoilée | centré, compteurs | montée en cascade |
| 79–87 % | 009 Sillage | voile crème | texte à droite | fondu |
| 89–100 % | 010 Découvrir | vue éclatée | texte à gauche, reste affiché | zoom |

Le film se termine à 50 % du scroll (`FRAME_SPEED = 2`), le reste du récit joue sur le cadrage et les couleurs.

## Le film

Les images ont été extraites de la vidéo d'origine (1924 × 1076, 6 s, 24 images par seconde) avec ffmpeg :

```bash
ffmpeg -i video.mp4 -vf "scale=1440:-2:flags=lanczos" -c:v libwebp -quality 72 -compression_level 6 frames/desktop/frame_%04d.webp
ffmpeg -i video.mp4 -vf "scale=960:-2:flags=lanczos"  -c:v libwebp -quality 70 -compression_level 6 frames/mobile/frame_%04d.webp
```

- `frames/desktop/` : 1440 px de large, environ 3,5 Mo au total
- `frames/mobile/` : 960 px, environ 2,2 Mo, chargées sous 768 px de large

Pour changer de vidéo : remplacer les images en gardant la numérotation, puis ajuster `FRAME_COUNT` dans `main.js`.

## Accessibilité et performance

- Chargement en deux temps : les 10 premières images d'abord, le reste ensuite, avec un écran de chargement qui ne bloque jamais plus de 12 secondes
- Canvas limité à un pixel ratio de 1,5 (les images source font 1440 px) ; rendu seulement quand le scroll bouge
- `prefers-reduced-motion` : pas de smooth scroll ni d'animation, sections dans le flux normal, une image fixe par chapitre, compteurs affichés directement
- Si un CDN ne répond pas, la page bascule sur cette version statique
- HTML sémantique, lien d'évitement, focus visible ; au clavier, un lien d'une section masquée fait défiler jusqu'à elle ; le canvas a une description textuelle
- Mobile : texte centré en bas sur un voile crème, film dans la moitié haute

## Personnaliser

- Cadrages par moment du récit : tableau `VIEW` dans `main.js` (point de l'image, position à l'écran, zoom)
- Zones de couleur : tableau `OVERLAY` dans `main.js`, palette en tête de `style.css`
- Moments d'apparition des textes : attributs `data-enter` / `data-leave` (en % du récit) et `data-animation` dans `index.html`
