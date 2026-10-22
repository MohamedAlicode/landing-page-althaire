# Altaïr — landing page scrollytelling (concept)

Concept de portfolio **non officiel** autour du parfum Altaïr de Parfums de Marly.
La page est construite autour d'un film produit : la vidéo est découpée en 287 images (48 par seconde), puis rejouée image par image sur un canvas au rythme du scroll. Le coffret s'ouvre, le capot s'envole, le flacon se démonte pièce par pièce pendant que le récit se déroule à côté.

## Stack

- `index.html`, `style.css`, `main.js`, `i18n.js` (textes anglais) : aucun build
- Canvas 2D : séquence d'images (`frames/`), une image nette par position de scroll, bords prolongés et adoucis pour que le film se fonde dans la page
- [GSAP](https://gsap.com/) 3.12.5 + ScrollTrigger : ouverture en cercle, entrées de section, compteurs, zones de couleur
- [Lenis](https://lenis.darkroom.engineering/) 1.1.13 : smooth scroll
- Ces bibliothèques sont copiées dans `vendor/` et servies avec le site : un bloqueur ou un CDN lent ne peut pas priver la page du film
- Polices Google : Bodoni Moda (titres), Instrument Sans (texte), DM Mono (repères)

## Lancer en local

Il faut un petit serveur HTTP pour charger les images du film :

```bash
# au choix
npx serve .
# ou
python3 -m http.server 8000
```

Puis ouvrir http://localhost:3000 (serve) ou http://localhost:8000 (Python). Une connexion internet n'est nécessaire que pour Google Fonts.

## Écran d'intro

Un écran de nuit étoilée (étoile, nom, barre dorée et pourcentage) couvre le chargement du début du film : il s'ouvre dès que les 24 premières images sont là (environ 1 Mo sur ordinateur, 340 Ko sur mobile), jamais plus de 10 s après l'arrivée. La barre suit le téléchargement octet par octet, elle avance donc en continu même sur une connexion lente. La suite du film arrive en fond, dans l'ordre : un filet doré en haut de la page suit son chargement puis s'efface. Si la connexion ne suit pas, la visite automatique attend que le film soit arrivé là où elle va (l'arrêt en cours dure simplement plus longtemps) : le film ne saute jamais d'image.

## Langues

La page est en français ; `i18n.js` contient la version anglaise. Le bouton FR / EN de l'en-tête change tous les textes sur place, sans recharger ni interrompre la visite (titres, chapitres, repères, formats, bouton de visite, textes pour lecteurs d'écran, titre de l'onglet). Le choix est mémorisé dans le navigateur. Sans choix mémorisé, la page suit la première langue du navigateur qui est le français ou l'anglais, et reste en français sinon. Un lien avec `?lang=en` (ou `?lang=fr`) ouvre directement une langue, pratique pour partager la version anglaise.

Chaque texte traduit porte un attribut `data-i18n` (ou `data-i18n-label` pour un `aria-label`) dans `index.html` ; la même clé dans `i18n.js` donne l'anglais. Les noms de chapitre sont sous `chapter.<id de la section>`.

## Lecture automatique

À l'arrivée, la page se déroule seule : 2 s sur le titre, l'ouverture du film, puis un arrêt par chapitre (4 s ; 5,5 s pour les repères, 7,5 s pour le blason, 6,5 s pour « Le porter » ; un arrêt de 1,5 s par pièce pour l'anatomie), soit environ 1 min 20 en tout. Entre deux arrêts, le récit avance à vitesse constante (`PACE`) : le film défile à environ 30 images par seconde, ce qui le garde fluide ; à l'arrêt, l'image se pose, nette, le temps de lire. Le bouton de l'en-tête met en pause, relance depuis la position courante, ou rejoue depuis le début une fois la visite terminée. La molette, le doigt, le clavier ou un lien laissent la main à l'utilisateur ; la visite reprend d'elle-même 5 s après son dernier geste, sauf s'il l'a mise en pause. Les durées se règlent dans `PACE`, `HOLD` et `buildTour()` (`main.js`). La visite démarre aussi quand le système demande moins d'animations (réglage « Effets d'animation » de Windows) : le bouton Pause est là pour l'arrêter.

## Structure du récit

| Moment | Chapitre | Film | Mise en page | Entrée |
| --- | --- | --- | --- | --- |
| Hero | ALTAÏR | ciel étoilé, constellation de l'Aigle, puis le film s'ouvre en cercle | centré | lettres qui montent |
| 2–11 % | 001 L'étoile | flacon et coffret | texte à gauche | glissé depuis la gauche |
| 12,5–20 % | 002 L'écrin | le coffret s'ouvre | texte à droite | glissé depuis la droite |
| 21,5–31 % | 003 Le geste | le capot s'envole, le flacon bascule | texte à gauche | rotation |
| 33–49 % | 004 Anatomie | vue éclatée | texte à droite, liste qui s'allume pièce par pièce | rideau (clip) |
| 51–65,5 % | 005–007 Notes | calque cognac, marquee géant | gauche / droite / gauche | fondu, zoom, glissé |
| 67–74 % | 008 Repères | calque nuit étoilée | centré, compteurs (3 formats, 16,7 a.-l., 12e, 1743) | montée en cascade |
| 75,5–81,5 % | 009 Le blason | flacon et coffret à découvert, blason visible | texte à gauche : l'histoire de 1743 et des chevaux de Marly | glissé depuis la gauche |
| 83–87,5 % | 010 Sillage | voile crème | texte à droite | fondu |
| 89–94,5 % | 011 Le porter | calque nuit étoilée | texte à gauche ; à droite, nos repères (soirée, saisons, notés en étoiles) et les notes sur la peau (tête, cœur, fond sur une ligne de temps) | rideau (clip), étoiles qui se remplissent, notes qui s'étirent |
| 96–100 % | 012 Découvrir | vue éclatée | texte à gauche, formats 75 / 125 / 200 ml, reste affiché | zoom |

Le film se termine à 50 % du scroll (`FRAME_SPEED = 2`), le reste du récit joue sur le cadrage et les couleurs.

## Le film

La vidéo d'origine (1924 × 1076, 6 s, 24 images par seconde) est d'abord interpolée à 48 images par seconde, pour qu'un petit mouvement de scroll fasse toujours avancer le film d'une image, puis encodée en WebP avec ffmpeg. On garde toute la définition de la vidéo (1920 px, après 2 px rognés de chaque côté, sans rééchantillonnage) et on accentue légèrement les détails (`cas`), car sur un grand écran l'image est de toute façon agrandie :

```bash
# 1. images intermédiaires calculées par interpolation de mouvement
ffmpeg -i video.mp4 -vf "crop=1920:1076:2:0,minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" png/f_%04d.png
# 2. WebP ordinateur et mobile
ffmpeg -framerate 48 -i png/f_%04d.png -vf "cas=strength=0.8" -c:v libwebp -quality 76 -compression_level 6 frames/desktop/frame_%04d.webp
ffmpeg -framerate 48 -i png/f_%04d.png -vf "scale=960:-2:flags=lanczos,cas=strength=0.8" -c:v libwebp -quality 66 -compression_level 6 frames/mobile/frame_%04d.webp
```

- `frames/desktop/` : 287 images de 1920 px, 11,6 Mo au total (1,9 Mo pour les 48 premières, attendues par l'écran de chargement)
- `frames/mobile/` : 287 images de 960 px, 4,2 Mo, chargées sous 768 px de large
- `frames/motion.json` (5 Ko) : pour chaque paire d'images voisines, le rectangle qui bouge de l'une à l'autre (en millièmes de l'image ; écart de luminosité supérieur à 8 sur une version réduite à 360 px, plus 6 % de marge)
- `frames/edges.png` (73 Ko) : pour chaque image, une vignette de 12 × 27 px dont la première et la dernière colonne et la première et la dernière ligne contiennent la couleur moyenne des bords. Le canvas s'en sert pour prolonger le papier et le sol au-delà de l'image. Elle se régénère à partir des PNG de l'étape 1 (24 vignettes par ligne, bords = moyenne des 18 px extérieurs).

Pour changer de vidéo : remplacer les images en gardant la numérotation, régénérer `edges.png` et `motion.json`, puis ajuster `FRAME_COUNT` dans `main.js`.

## Accessibilité et performance

- Chargement progressif : la vignette des bords et les 12 premières images d'abord, le reste ensuite sur 8 connexions, dans l'ordre. La page s'ouvre dès que les 24 premières images sont là (le début du film), jamais plus de 10 secondes après l'arrivée ; la suite arrive en fond (voir « Écran d'intro »)
- `index.html` appelle `style.css` et `main.js` avec un numéro de version (`?v=…`) : à changer à chaque mise en ligne pour que les navigateurs ne gardent pas l'ancienne version en cache
- Les images sont gardées compressées en mémoire et décodées hors du fil principal (`createImageBitmap`) dans une fenêtre glissante autour de la position courante (48 images sur ordinateur, 32 sur mobile, surtout dans le sens du scroll) ; les images qui sortent de la fenêtre sont libérées
- L'image affichée rattrape la position du scroll en douceur, sans sauter d'image. Quand le film avance de moins d'une image par rafraîchissement (un cran de molette sur ordinateur n'avance que de 4 images), l'image suivante apparaît en transparence, seulement dans la zone qui bouge : le mouvement reste continu. À l'arrêt, le film se pose sur une seule image nette
- Canvas opaque, juste assez défini pour poser l'image source pixel pour pixel (pixel ratio 1,5 au plus) : sur un écran plus grand, le navigateur l'agrandit lui-même. Un canvas à la pleine définition de l'écran, lissage « high », ne gagne rien de visible sur un écran 4K et coûte trois fois plus de pixels ; le fond autour de l'image est calculé en basse définition puis agrandi ; rendu seulement quand le scroll bouge
- `prefers-reduced-motion` : le film et la visite restent (c'est le cœur de la page, et ce réglage est souvent coupé sur PC sans que l'utilisateur le sache) ; seules les petites animations CSS (indicateur de scroll, survols) sont coupées
- Version statique (sections dans le flux normal, une image fixe par chapitre, compteurs affichés directement) seulement si `main.js` plante, ou s'il n'a pas démarré au bout de 8 s ; dans ce dernier cas, le film reprend dès que les scripts arrivent
- HTML sémantique, lien d'évitement, focus visible ; au clavier, un lien d'une section masquée fait défiler jusqu'à elle ; le canvas a une description textuelle
- Mobile : texte centré en bas sur un voile crème, film dans la moitié haute

## Personnaliser

- Cadrages par moment du récit : tableau `VIEW` dans `main.js` (point de l'image, position à l'écran, zoom)
- Zones de couleur : tableau `OVERLAY` dans `main.js`, palette en tête de `style.css`
- Moments d'apparition des textes : attributs `data-enter` / `data-leave` (en % du récit) et `data-animation` dans `index.html`
