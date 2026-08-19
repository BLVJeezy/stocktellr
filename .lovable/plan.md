# Productfoto's zichtbaar maken

## Wat er aan de hand is
Alle 294 productafbeeldingen zijn al gegenereerd en staan online (een testlink laadt correct). Maar in de database staat bij elk artikel nog `image_url` leeg — daarom toont de app overal het lege kader in plaats van een foto.

## Aanpak
1. De 294 gegenereerde afbeeldings-URL's per artikel wegschrijven naar de database (één migratie met UPDATE per artikel-id).
2. Controleren op de telpagina dat de foto's laden, met nette fallback (placeholder-icoon) voor artikelen zonder foto.
3. Kort visueel nakijken op mobiel en desktop.

## Technisch
- Migratie: `UPDATE public.items SET image_url = ... WHERE id = ...` voor de 294 id's uit de reeds gegenereerde lijst.
- Bestaande rendering in `src/routes/count.$category.tsx` gebruikt al `item.image_url`; alleen fallback/lazy-loading afwerken.
- Geen nieuwe afbeeldingen genereren; de bestaande CDN-bestanden worden hergebruikt.
