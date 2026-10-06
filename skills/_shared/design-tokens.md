# Tokens Claude Design -> projet (source unique)

Cote DESIGN : verifie le 2026-08-27 dans colors_and_type.css du _ds
a730067f. Un autre _ds peut differer : /sk-prep relit le css importe
et corrige la table dans design.md ; il met a jour CE fichier si la
difference est durable.

Cote PROJET : se controle dans la LIB REELLEMENT INSTALLEE
(node_modules/@septeo/septeo-ui-components/dist/*.css), pas dans le
css du _ds.

⚠ Corrige le 2026-08-28 (MySepteoWeb, constate en review d'US) : les
lignes red-* et purple-* pointaient vers danger-* et info-*, qui
n'existent PAS. Les seuls prefixes de palette du theme sont **error,
information, neutral, primary, secondary, success, warning**. Une
entree fausse ici produit une couleur NULLE dans le code — invisible
au build comme au typecheck, visible seulement a l'oeil ou en review.

Usage : /sk-prep copie cette table dans FEATURE_DIR/design.md §3
(le Sonnet et le reviewer ne lisent que design.md), puis ajoute
une ligne par variable non couverte, resolue via le css du _ds.

## Palettes

| design | projet |
|---|---|
| grey-XX | neutral-XX |
| blueS-XX | primary-XX |
| orangeS-XX | secondary-XX |
| green-* | success-* |
| red-* | error-* |
| purple-* | information-* |
| yellow-* | warning-* |

Note : grey-01 (#FFFFFF) n'a pas d'homologue neutral-01 — il se mappe
sur **neutral-00**.

## Variables semantiques

| design | projet |
|---|---|
| --primary | primary-80 |
| --primary-hover | primary-70 |
| --secondary | primary-50 |
| --accent | secondary-50 |
| --primary-text-1 | primary-90 |
| --primary-bg | primary-05 |
| --primary-icon | primary-50 |
| --fg-1 | neutral-90 |
| --fg-2 | neutral-70 |
| --fg-3 | neutral-60 |
| --fg-4 | neutral-50 |
| --bg-page | neutral-05 |
| --border-input | neutral-30 |
| --border-divider | neutral-10 |
| --border-cell | neutral-10 |
| --border-focus | primary-50 |

## Tailles (px du design -> cible dans le code)

Controle le 2026-09-16 dans septeo-ui-components.css installe.
Prefere le token ; a defaut la classe d echelle Tailwind v4 (1 pas
= 0.25rem = 4px, quarts acceptes) ; jamais `[Npx]`.
La classe d echelle n existe QUE pour l espacement, la taille et
l interligne (h-, w-, size-, p*-, m*-, gap-, leading-). Font-size et
radius n en ont pas : `text-3.75` et `rounded-1.5` compilent sans
erreur et ne produisent AUCUN CSS (verifie le 2026-10-02 en compilant
avec tailwindcss 4.2.2). Hors token, une police ou un rayon s ecrit en
rem entre crochets (`text-[0.9375rem]`, `rounded-[0.375rem]`) ou passe
en ECART §5.

| px | font-size | line-height | spacing / radius |
|---|---|---|---|
| 2 | | | --spacing-very-tiny, --radius-very-tiny |
| 4 | | | --spacing-tiny, --radius-tiny |
| 6 | | | --spacing-almost-tiny |
| 8 | | | --spacing-very-moderate, --radius |
| 10 | --font-size-very-small | | --spacing-almost-very-moderate |
| 12 | --font-size-small | | --spacing-moderate |
| 14 | --font-size-normal | --line-height-tiny | |
| 16 | --font-size-base | --line-height-very-small | --spacing-base, --radius-base |
| 18 | | --line-height-almost-very-small | |
| 20 | --font-size-base-medium | --line-height-small | --spacing-base-medium |
| 24 | --font-size-medium | --line-height-normal | --spacing-medium, --radius-large |
| 32 | --font-size-large, --font-size-h1 | | --spacing-large |
| autre multiple de 2 | rem entre crochets : text-[1.375rem] (22) | classe d echelle : leading-4.5 (18) | classe d echelle : h-7.5 (30), px-2.75 (11), gap-5.5 (22) ; radius : rounded-[0.375rem] (6) |
| demi-pixel ou impair hors echelle (13, 12.5, 11.5, 10.5, 17) | ECART design -> §5, defaut = plus proche ci-dessus | | |

## Syntaxe projet (Tailwind, parentheses jamais crochets)

- bg-(--primary-05), text-(--neutral-90), border-(--neutral-30)
- text-(length:--font-size-small)
- Hex litteral et token design (--blueS-*, --fg-*, --bg-page) dans
  le code = interdit (reviewer check 8).
- Valeur arbitraire en px (`text-[13px]`, `h-[30px]`, `leading-[17px]`)
  = interdit : token ou classe d echelle selon §Tailles. Seule forme
  arbitraire admise : `(length:--token)` et `(--token)`.
