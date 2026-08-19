# StockTellr App

Build a real-time mobile-first Inventory Counting App (Stocktelling App) designed for smartphones.

1. UI & Navigation:

- Mobile-first, ultra-clean UI using Tailwind CSS and Lucide icons.

- Top navigation or cards on the main dashboard representing 5 counting categories based on locations/products:

  1. Snoeptoog (Locations: Voorraadhok, Toog | Units: LOS, DOOS)

  2. Ijs Berging (Locations: Berging, Vriezer | Units: LOS, DOOS)

  3. Frigo Los (Locations: Rek 1, Rek 2 | Unit: LOS)

  4. Frigo Trays & Berging (Locations: Frigo, Berging | Unit: TRAYS)

  5. Haribo (Locations: Voorraad Klein | Units: KG, BAK)

2. Counting Screen Features:

- Search bar at the top to filter items instantly.

- List of items per category with clear row items.

- Inputs for each location column associated with that item (e.g., number input or +/- buttons for quick tapping).

- Automatic sum row or total display per item across all configured locations.

- Status badge on each row: "Nog te tellen" (Gray) vs "Geteld" (Green checkmark) once a value > 0 is entered.

3. Features & Real-time setup:

- Connect to Supabase for database storage and Supabase Realtime subscriptions so multiple users on separate phones update the counts simultaneously without page refreshes.

- Export button on the main dashboard to export all final count totals across all categories into a single formatted CSV or Excel file.

- Pre-populate mock inventory items for each category (e.g., Croky Chips, Ben & Jerry's, Calippo, Aquarius, Coca Cola, Haribo Aardbeien) with their respective locations and unit types.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://stocktellr.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2788816b-c8dc-472c-b055-94115174dabf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
