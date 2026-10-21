# Altaïr — landing page scrollytelling (concept)

Concept de portfolio **non officiel** autour du parfum Altaïr de Parfums de Marly.
La page est construite autour d'un film produit : la vidéo est découpée en 287 images (48 par seconde), puis rejouée image par image sur un canvas au rythme du scroll. Le coffret s'ouvre, le capot s'envole, le flacon se démonte pièce par pièce pendant que le récit se déroule à côté.

## Stack

- `index.html`, `style.css`, `main.js` : aucun build
- Canvas 2D : séquence d'images (`frames/`), une image nette par position de scroll, bords prolongés et adoucis pour que le film se fonde dans la page
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

La vidéo d'origine (1924 × 1076, 6 s, 24 images par seconde) est d'abord interpolée à 48 images par seconde, pour qu'un petit mouvement de scroll fasse toujours avancer le film d'une image, puis encodée en WebP avec ffmpeg :

```bash
# 1. images intermédiaires calculées par interpolation de mouvement
ffmpeg -i video.mp4 -vf "scale=1440:-2:flags=lanczos,minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" png/f_%04d.png
# 2. WebP ordinateur et mobile
ffmpeg -framerate 48 -i png/f_%04d.png -c:v libwebp -quality 66 -compression_level 6 frames/desktop/frame_%04d.webp
ffmpeg -framerate 48 -i png/f_%04d.png -vf "scale=960:-2:flags=lanczos" -c:v libwebp -quality 62 -compression_level 6 frames/mobile/frame_%04d.webp
```

- `frames/desktop/` : 287 images de 1440 px, 6,1 Mo au total
- `frames/mobile/` : 287 images de 960 px, 3,3 Mo, chargées sous 768 px de large
- `frames/edges.png` (73 Ko) : pour chaque image, une vignette de 12 × 27 px dont la première et la dernière colonne et la première et la dernière ligne contiennent la couleur moyenne des bords. Le canvas s'en sert pour prolonger le papier et le sol au-delà de l'image. Elle se régénère à partir des PNG de l'étape 1 (24 vignettes par ligne, bords = moyenne des 18 px extérieurs).

Pour changer de vidéo : remplacer les images en gardant la numérotation, régénérer `edges.png`, puis ajuster `FRAME_COUNT` dans `main.js`.

## Accessibilité et performance

- Chargement progressif : la vignette des bords et les 12 premières images d'abord, le reste ensuite sur 8 connexions ; l'écran de chargement ne bloque jamais plus de 15 secondes
- Les images sont gardées compressées en mémoire et décodées hors du fil principal (`createImageBitmap`) dans une fenêtre glissante autour de la position courante (48 images sur ordinateur, 32 sur mobile, surtout dans le sens du scroll) ; les images qui sortent de la fenêtre sont libérées
- L'image affichée rattrape la position du scroll en douceur, sans sauter d'image ni fondre deux images l'une dans l'autre
- Canvas opaque, limité à la définition des images source (pixel ratio 1,5 au plus) ; le fond autour de l'image est calculé en basse définition puis agrandi ; rendu seulement quand le scroll bouge
- `prefers-reduced-motion` : pas de smooth scroll ni d'animation, sections dans le flux normal, une image fixe par chapitre, compteurs affichés directement
- Si un CDN ne répond pas, la page bascule sur cette version statique
- HTML sémantique, lien d'évitement, focus visible ; au clavier, un lien d'une section masquée fait défiler jusqu'à elle ; le canvas a une description textuelle
- Mobile : texte centré en bas sur un voile crème, film dans la moitié haute

## Personnaliser

- Cadrages par moment du récit : tableau `VIEW` dans `main.js` (point de l'image, position à l'écran, zoom)
- Zones de couleur : tableau `OVERLAY` dans `main.js`, palette en tête de `style.css`
- Moments d'apparition des textes : attributs `data-enter` / `data-leave` (en % du récit) et `data-animation` dans `index.html`
