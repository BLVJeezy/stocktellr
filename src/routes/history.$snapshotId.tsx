import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { useSnapshot, type SnapshotRow } from "@/hooks/use-snapshots";
import { CATEGORIES, toCsv } from "@/lib/inventory";
import { exportSnapshotPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/history/$snapshotId")({
  head: () => ({
    meta: [{ title: "Telling detail — Stocktelling" }],
  }),
  component: SnapshotDetail,
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByItem(rows: SnapshotRow[]) {
  const map = new Map<
    string,
    { name: string; category: string; unit: string; sort_order: number; locations: SnapshotRow[] }
  >();
  for (const r of rows) {
    const key = `${r.item_category}::${r.item_name}::${r.item_unit}`;
    const existing = map.get(key);
    if (existing) {
      existing.locations.push(r);
    } else {
      map.set(key, {
        name: r.item_name,
        category: r.item_category,
        unit: r.item_unit,
        sort_order: r.item_sort_order,
        locations: [r],
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );
}

function SnapshotDetail() {
  const { snapshotId } = Route.useParams();
  const { data, isLoading } = useSnapshot(snapshotId);

  const grouped = useMemo(() => {
    if (!data?.rows) return {};
    const byCategory: Record<string, ReturnType<typeof groupByItem>> = {};
    for (const cat of CATEGORIES) {
      const catRows = data.rows.filter((r) => r.item_category === cat.key);
      if (catRows.length) byCategory[cat.key] = groupByItem(catRows);
    }
    return byCategory;
  }, [data?.rows]);

  const handleExport = () => {
    if (!data?.snapshot || !data.rows) return;
    const rows: string[][] = [
      ["Categorie", "Artikel", "Eenheid", "Locatie", "Aantal", "Totaal"],
    ];
    for (const cat of CATEGORIES) {
      const items = grouped[cat.key] ?? [];
      for (const item of items) {
        const total = item.locations.reduce((s, l) => s + Number(l.qty), 0);
        for (const loc of item.locations) {
          rows.push([
            cat.name,
            item.name,
            item.unit,
            loc.location,
            String(loc.qty),
            String(total),
          ]);
        }
      }
    }
    const blob = new Blob(["\uFEFF" + toCsv(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.snapshot.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV gedownload");
  };

  const handleExportPdf = () => {
    if (!data?.snapshot || !data.rows) return;
    exportSnapshotPdf(data.snapshot.label, data.snapshot.taken_at, data.rows);
    toast.success("PDF gedownload");
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!data?.snapshot) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md bg-background p-6">
        <Link to="/history" className="inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="size-4" /> Terug naar historiek
        </Link>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Deze telling bestaat niet meer.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-10 md:max-w-3xl md:pb-16">
      <header className="rounded-b-3xl bg-header px-5 pb-8 pt-8 text-header-foreground md:mt-6 md:rounded-3xl md:px-10 md:py-10">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 text-sm opacity-75 transition-opacity hover:opacity-100"
        >
          <ArrowLeft className="size-4" />
          Historiek
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold tracking-tight md:text-4xl">
              {data.snapshot.label}
            </h1>
            <p className="mt-1 text-sm opacity-75">
              Opgeslagen op {formatDate(data.snapshot.taken_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] md:hover:brightness-110"
            >
              <FileText className="size-4" />
              PDF
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-header-foreground transition-colors hover:bg-white/20 active:scale-[0.98]"
            >
              <Download className="size-4" />
              CSV
            </button>
          </div>
        </div>
      </header>

      <section className="space-y-6 px-4 pt-5 md:px-0 md:pt-8">
        {CATEGORIES.map((cat) => {
          const items = grouped[cat.key];
          if (!items || items.length === 0) return null;
          return (
            <div key={cat.key} className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {cat.name}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {items.map((item, i) => {
                  const total = item.locations.reduce((s, l) => s + Number(l.qty), 0);
                  return (
                    <div
                      key={`${item.name}-${item.unit}-${i}`}
                      className="border-b border-border p-4 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-card-foreground">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs uppercase text-muted-foreground">
                            {item.unit}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold tabular-nums text-card-foreground">
                            {total}
                          </p>
                          <p className="text-xs uppercase text-muted-foreground">
                            totaal
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        {item.locations.map((loc) => (
                          <div
                            key={loc.id}
                            className="flex items-center justify-between rounded-lg bg-secondary/40 px-2 py-1"
                          >
                            <span className="truncate text-muted-foreground">
                              {loc.location}
                            </span>
                            <span className="tabular-nums font-medium text-card-foreground">
                              {loc.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
