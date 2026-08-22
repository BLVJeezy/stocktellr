import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Camera,
  Candy,
  Download,
  IceCream2,
  Loader2,
  Refrigerator,
  Package,
  ChevronRight,
  Radio,
  History,
  Save,
} from "lucide-react";
import { Gamepad2, Popcorn, Lightbulb, Ticket, Glasses } from "lucide-react";
import { FileText } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useInventory } from "@/hooks/use-inventory";
import { useCategoryBanners, uploadCategoryBanner } from "@/hooks/use-category-banners";
import { useSaveSnapshot } from "@/hooks/use-snapshots";
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
  gadgets: Gamepad2,
  jimmys: Popcorn,
  lampen: Lightbulb,
  bonnen: Ticket,
  brillen: Glasses,
};

function Dashboard() {
  const { data, isLoading } = useInventory();
  const { data: banners } = useCategoryBanners();
  const saveSnapshot = useSaveSnapshot();
  const [defaultLabel] = useState(() => {
    const now = new Date();
    const months = [
      "Januari", "Februari", "Maart", "April", "Mei", "Juni",
      "Juli", "Augustus", "September", "Oktober", "November", "December",
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });

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

  const handleSaveSnapshot = () => {
    const label = window.prompt(
      "Naam voor deze telling (bv. maand):",
      defaultLabel
    );
    if (!label || !label.trim()) return;
    saveSnapshot.mutate(
      { label: label.trim(), items, counts },
      {
        onSuccess: () => toast.success(`Telling "${label.trim()}" opgeslagen`),
        onError: (err) => toast.error(`Opslaan mislukt: ${(err as Error).message}`),
      }
    );
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
        <div className="mt-5 grid grid-cols-2 gap-2 md:mt-0 md:shrink-0 md:grid-cols-4">
          <button
            onClick={handleSaveSnapshot}
            disabled={saveSnapshot.isPending || isLoading}
            className="col-span-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60 md:col-span-1 md:hover:brightness-110"
          >
            {saveSnapshot.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Bewaar telling
          </button>
          <Link
            to="/history"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-header-foreground transition-colors hover:bg-white/20 active:scale-[0.98]"
          >
            <History className="size-4" />
            Historiek
          </Link>
          <button
            onClick={handleExportPdf}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-header-foreground transition-colors hover:bg-white/20 active:scale-[0.98]"
          >
            <FileText className="size-4" />
            PDF
          </button>
          <button
            onClick={handleExport}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-header-foreground transition-colors hover:bg-white/20 active:scale-[0.98]"
          >
            <Download className="size-4" />
            CSV
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
              <CategoryTile
                key={cat.key}
                categoryKey={cat.key}
                name={cat.name}
                locations={cat.locations}
                units={cat.units}
                Icon={Icon}
                counted={counted}
                total={catItems.length}
                pct={pct}
                bannerUrl={banners?.[cat.key] ?? null}
              />
            );
          })
        )}
      </section>
    </main>
  );
}

function CategoryTile({
  categoryKey,
  name,
  locations,
  units,
  Icon,
  counted,
  total,
  pct,
  bannerUrl,
}: {
  categoryKey: string;
  name: string;
  locations: string[];
  units: string[];
  Icon: typeof Package;
  counted: number;
  total: number;
  pct: number;
  bannerUrl: string | null;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadCategoryBanner(categoryKey, file);
      setFailed(false);
      await queryClient.invalidateQueries({ queryKey: ["category-banners"] });
      toast.success("Bannerfoto bijgewerkt");
    } catch (err) {
      toast.error(`Uploaden mislukt: ${(err as Error).message ?? "onbekende fout"}`);
    } finally {
      setBusy(false);
    }
  };

  const goToCategory = () => {
    void navigate({ to: "/count/$category", params: { category: categoryKey } });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all md:hover:-translate-y-0.5 md:hover:border-primary/40 md:hover:shadow-md">
      <div className="relative flex h-24 w-full items-center justify-center overflow-hidden bg-accent/60">
        {bannerUrl && !failed ? (
          <img
            src={bannerUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <Icon className="size-8 text-accent-foreground/40" />
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          aria-label={`Bannerfoto instellen voor ${name}`}
          className="absolute bottom-1.5 right-1.5 z-10 flex size-9 items-center justify-center rounded-lg bg-card/95 text-card-foreground shadow-md ring-1 ring-border transition-colors hover:bg-card active:scale-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>
      </div>

      <button
        type="button"
        onClick={goToCategory}
        className="block w-full p-4 text-left active:scale-[0.99] md:p-5"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-card-foreground">{name}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {locations.join(" · ")} — {units.join("/")}
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
            {counted}/{total}
          </span>
        </div>
      </button>
    </div>
  );
}