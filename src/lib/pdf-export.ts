import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { CATEGORIES, type Count, type Item } from "./inventory";
import { lastFormula } from "./formula-history";

/** Builds a per-category PDF report with the formulas used and totals. */
export function exportInventoryPdf(items: Item[], counts: Count[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const date = new Date().toLocaleDateString("nl-BE");
  let first = true;
  let grandTotal = 0;

  for (const cat of CATEGORIES) {
    const catItems = items
      .filter((i) => i.category === cat.key)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (catItems.length === 0) continue;

    if (!first) doc.addPage();
    first = false;

    doc.setFontSize(16);
    doc.text(`Stocktelling — ${cat.name}`, 40, 46);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`${date} · locaties: ${cat.locations.join(", ")}`, 40, 62);
    doc.setTextColor(0);

    let catTotal = 0;
    const body = catItems.map((item) => {
      const perLoc = cat.locations.map((loc) => {
        const qty = counts.find((c) => c.item_id === item.id && c.location === loc)?.qty ?? 0;
        const formula = lastFormula(item.id, loc);
        return formula ? `${formula} = ${qty}` : String(qty);
      });
      const total = cat.locations.reduce(
        (s, loc) => s + (counts.find((c) => c.item_id === item.id && c.location === loc)?.qty ?? 0),
        0,
      );
      catTotal += total;
      return [item.name, item.unit, ...perLoc, String(total)];
    });

    autoTable(doc, {
      startY: 76,
      head: [["Artikel", "Eenheid", ...cat.locations, "Totaal"]],
      body,
      foot: [
        [
          { content: `Totaal ${cat.name}`, colSpan: 2 + cat.locations.length },
          String(catTotal),
        ],
      ],
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [39, 58, 46], textColor: 255 },
      footStyles: { fillColor: [231, 240, 233], textColor: 20, fontStyle: "bold" },
      columnStyles: { 1: { halign: "center" } },
      margin: { left: 40, right: 40, bottom: 40 },
    });

    grandTotal += catTotal;
  }

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Samenvatting", 40, 46);
  autoTable(doc, {
    startY: 66,
    head: [["Categorie", "Artikelen", "Geteld", "Totaal stuks"]],
    body: CATEGORIES.map((cat) => {
      const catItems = items.filter((i) => i.category === cat.key);
      const totals = catItems.map((i) =>
        counts.filter((c) => c.item_id === i.id).reduce((s, c) => s + c.qty, 0),
      );
      return [
        cat.name,
        String(catItems.length),
        String(totals.filter((t) => t > 0).length),
        String(totals.reduce((s, t) => s + t, 0)),
      ];
    }),
    foot: [[{ content: "Algemeen totaal", colSpan: 3 }, String(grandTotal)]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [39, 58, 46], textColor: 255 },
    footStyles: { fillColor: [231, 240, 233], textColor: 20, fontStyle: "bold" },
    margin: { left: 40, right: 40 },
  });

  doc.save(`stocktelling-${new Date().toISOString().slice(0, 10)}.pdf`);
}