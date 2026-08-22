import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useInventory } from "@/hooks/use-inventory";
import { CATEGORIES, toCsv, type Item, type Count } from "@/lib/inventory";
import { exportTotalsPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/totaal")({
  head: () => ({
    meta: [{ title: "Totaaloverzicht — Stocktelling" }],
  }),
  component: TotaalScreen,
});

type Row = {
  categoryName: string;
  productName: string;
  los: number;
  doos: number;
  totaal: number;
};

function isLosUnit(unit: string) {
  const u = unit.toUpperCase();
  return u === "LOS" || u === "ST" || u === "KG";
}

function buildRows(items: Item[], counts: Count[]): Row[] {
  const rows: Row[] = [];
  for (const cat of CATEGORIES) {
    const catItems = items.filter((i) => i.category === cat.key);
    if (catItems.length === 0) continue;

    const byName = new Map<string, Item[]>();
    for (const item of catItems) {
      const arr = byName.get(item.name);
      if (arr) arr.push(item);
      else byName.set(item.name, [item]);
    }

    for (const [name, units] of byName.entries()) {
      let los = 0;
      let doos = 0;
      for (const unit of units) {
        // The stored qty already reflects real units (auto-multiplied by
        // units_per_pack at save time), so summing it directly gives the
        // correct total regardless of whether a pack is 6, 24, or 45 pieces.
        const unitTotal = cat.locations.reduce(
          (s, loc) =>
            s + (counts.find((c) => c.item_id === unit.id && c.location === loc)?.qty ?? 0),
          0
        );
        if (isLosUnit(unit.unit)) los += unitTotal;
        else doos += unitTotal;
      }
      rows.push({
        categoryName: cat.name,
        productName: name,
        los,
        doos,
        totaal: los + doos,
      });
    }
  }
  return rows;
}

function TotaalScreen() {
  const { data, isLoading } = useInventory();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    if (!data) return [];
    const all = buildRows(data.items, data.counts);
    const q = search.trim().toLowerCase();
    return q
      ? all.filter(
          (r) =>
            r.productName.toLowerCase().includes(q) || r.categoryName.toLowerCase().includes(q)
        )
      : all;
  }, [data, search]);

  const grandTotal = rows.reduce((s, r) => s + r.totaal, 0);

  const handleExportCsv = () => {
    const csvRows: string[][] = [["Categorie", "Product", "Los", "Doos", "Totaal"]];
    for (const r of rows) {
      csvRows.push([r.categoryName, r.productName, String(r.los), String(r.doos), String(r.totaal)]);
    }
    const blob = new Blob(["\uFEFF" + toCsv(csvRows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "totaaloverzicht.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV gedownload");
  };

  const handleExportPdf = () => {
    exportTotalsPdf(rows);
    toast.success("PDF gedownload");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-10 md:max-w-4xl md:pb-16">
      <header className="sticky top-0 z-10 rounded-b-2xl bg-header px-4 pb-4 pt-5 text-header-foreground shadow-sm md:rounded-3xl md:px-8 md:py-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
            aria-label="Terug naar dashboard"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight md:text-2xl">Totaaloverzicht</h1>
            <p className="truncate text-xs opacity-70">Los + Doos per product, alle categorieën</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek product of categorie..."
              className="w-full rounded-xl bg-white/10 py-2.5 pl-9 pr-3 text-sm text-header-foreground placeholder:text-header-foreground/50 outline-none ring-primary/60 focus:ring-2"
            />
          </div>
          <button
            onClick={handleExportPdf}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <FileText className="size-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-header-foreground hover:bg-white/20"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </header>

      <section className="px-3 pt-4 md:px-8 md:pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Geen producten gevonden.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-2 py-2.5 text-right">Los</th>
                  <th className="px-2 py-2.5 text-right">Doos</th>
                  <th className="px-3 py-2.5 text-right">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.categoryName}-${r.productName}`}
                    className={"border-b border-border last:border-b-0 " + (i % 2 === 1 ? "bg-secondary/10" : "")}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-card-foreground">{r.productName}</div>
                      <div className="text-xs text-muted-foreground">{r.categoryName}</div>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-card-foreground">{r.los}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-card-foreground">{r.doos}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-card-foreground">
                      {r.totaal}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/10">
                  <td className="px-3 py-3 font-semibold text-primary" colSpan={3}>
                    Grand totaal
                  </td>
                  <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary">
                    {grandTotal}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
