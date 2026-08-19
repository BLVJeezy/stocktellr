import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  Candy,
  Download,
  IceCream2,
  Loader2,
  Refrigerator,
  Package,
  ChevronRight,
  Radio,
} from "lucide-react";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { useInventory } from "@/hooks/use-inventory";
import { CATEGORIES, toCsv } from "@/lib/inventory";
import { exportInventoryPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stocktelling — Real-time voorraad tellen" },
      {
        name: "description",
        content:
          "Tel je voorraad live met meerdere telefoons tegelijk. Snoeptoog, ijs, frigo en Haribo in één app.",
      },
      { property: "og:title", content: "Stocktelling — Real-time voorraad tellen" },
      {
        property: "og:description",
        content: "Live inventaris tellen op smartphone, met export naar CSV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const ICONS: Record<string, typeof Candy> = {
  snoeptoog: Candy,
  ijs_berging: IceCream2,
  frigo_los: Refrigerator,
  frigo_trays: Boxes,
  haribo: Package,
};

function Dashboard() {
  const { data, isLoading } = useInventory();

  const items = data?.items ?? [];
  const counts = data?.counts ?? [];

  const totalFor = (itemId: string) =>
    counts.filter((c) => c.item_id === itemId).reduce((s, c) => s + c.qty, 0);

  const handleExport = () => {
    const rows: string[][] = [["Categorie", "Artikel", "Eenheid", "Locatie", "Aantal", "Totaal"]];
    for (const cat of CATEGORIES) {
      const catItems = items
        .filter((i) => i.category === cat.key)
        .sort((a, b) => a.sort_order - b.sort_order);
      for (const item of catItems) {
        const total = totalFor(item.id);
        for (const loc of cat.locations) {
          const qty = counts.find((c) => c.item_id === item.id && c.location === loc)?.qty ?? 0;
          rows.push([cat.name, item.name, item.unit, loc, String(qty), String(total)]);
        }
      }
    }
    const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stocktelling-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export gedownload");
  };

  const handleExportPdf = () => {
    exportInventoryPdf(items, counts);
    toast.success("PDF gedownload");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-10 md:max-w-5xl md:pb-16">
      <header className="rounded-b-3xl bg-header px-5 pb-8 pt-8 text-header-foreground md:mt-6 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-6 md:rounded-3xl md:px-10 md:py-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest opacity-70">
            <Radio className="size-3.5" />
            Live telling
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Stocktelling</h1>
          <p className="mt-1 text-sm opacity-75">
            Iedereen telt tegelijk — alles synchroniseert vanzelf.
          </p>
        </div>
        <div className="mt-5 grid gap-2 md:mt-0 md:shrink-0 md:grid-cols-2">
          <button
            onClick={handleExportPdf}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] md:hover:brightness-110"
          >
            <FileText className="size-4" />
            Exporteer PDF
          </button>
          <button
            onClick={handleExport}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-header-foreground transition-colors hover:bg-white/20 active:scale-[0.98]"
          >
            <Download className="size-4" />
            Exporteer CSV
          </button>
        </div>
      </header>

      <section className="space-y-3 px-4 pt-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 md:px-0 md:pt-8 lg:grid-cols-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground md:col-span-full">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const Icon = ICONS[cat.key] ?? Package;
            const catItems = items.filter((i) => i.category === cat.key);
            const counted = catItems.filter((i) => totalFor(i.id) > 0).length;
            const pct = catItems.length ? Math.round((counted / catItems.length) * 100) : 0;
            return (
              <Link
                key={cat.key}
                to="/count/$category"
                params={{ category: cat.key }}
                className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition-all active:scale-[0.99] md:p-5 md:hover:-translate-y-0.5 md:hover:border-primary/40 md:hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-card-foreground">
                      {cat.name}
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {cat.locations.join(" · ")} — {cat.units.join("/")}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-pending">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {counted}/{catItems.length}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}