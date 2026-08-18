import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { setCount, useInventory } from "@/hooks/use-inventory";
import { evalFormula, getCategory, type Category } from "@/lib/inventory";

export const Route = createFileRoute("/count/$category")({
  beforeLoad: ({ params }) => {
    if (!getCategory(params.category)) throw notFound();
  },
  head: ({ params }) => {
    const cat = getCategory(params.category);
    const title = `${cat?.name ?? "Telling"} tellen — Stocktelling`;
    const description = `Tel de voorraad van ${cat?.name ?? "deze categorie"} live per locatie: ${cat?.locations.join(", ") ?? ""}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CountScreen,
});

function CountScreen() {
  const { category } = Route.useParams();
  const cat = getCategory(category) as Category;
  const { data, isLoading } = useInventory();
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const list = (data?.items ?? [])
      .filter((i) => i.category === category)
      .sort((a, b) => a.sort_order - b.sort_order);
    const q = search.trim().toLowerCase();
    return q ? list.filter((i) => i.name.toLowerCase().includes(q)) : list;
  }, [data, category, search]);

  const counts = data?.counts ?? [];
  const qtyOf = (itemId: string, loc: string) =>
    counts.find((c) => c.item_id === itemId && c.location === loc)?.qty ?? 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-16">
      <header className="sticky top-0 z-10 rounded-b-2xl bg-header px-4 pb-4 pt-5 text-header-foreground shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex size-9 items-center justify-center rounded-lg bg-white/10 transition-colors active:bg-white/20"
            aria-label="Terug naar dashboard"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight">{cat.name}</h1>
            <p className="truncate text-xs opacity-70">{cat.locations.join(" · ")}</p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek artikel..."
            className="w-full rounded-xl bg-white/10 py-2.5 pl-9 pr-3 text-sm text-header-foreground placeholder:text-header-foreground/50 outline-none ring-primary/60 focus:ring-2"
          />
        </div>
      </header>

      <section className="space-y-3 px-3 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Geen artikelen gevonden.</p>
        ) : (
          items.map((item) => {
            const total = cat.locations.reduce((s, loc) => s + qtyOf(item.id, loc), 0);
            const done = total > 0;
            return (
              <article key={item.id} className="rounded-2xl border border-border bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-card-foreground">
                      {item.name}
                    </h2>
                    <span className="mt-1 inline-block rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      {item.unit}
                    </span>
                  </div>
                  {done ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-semibold text-success-foreground">
                      <Check className="size-3" /> Geteld
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-pending px-2.5 py-1 text-[11px] font-semibold text-pending-foreground">
                      Nog te tellen
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {cat.locations.map((loc) => (
                    <LocationRow
                      key={loc}
                      itemId={item.id}
                      location={loc}
                      qty={qtyOf(item.id, loc)}
                    />
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Totaal
                  </span>
                  <span className="text-base font-bold tabular-nums text-card-foreground">
                    {total} <span className="text-xs font-medium text-muted-foreground">{item.unit}</span>
                  </span>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

function LocationRow({
  itemId,
  location,
  qty,
}: {
  itemId: string;
  location: string;
  qty: number;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);

  const save = async (next: number) => {
    const value = Number.isFinite(next) && next > 0 ? next : 0;
    try {
      await setCount(itemId, location, value);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    } catch {
      toast.error("Opslaan mislukt");
    }
  };

  const commit = async () => {
    if (draft === null) return;
    const raw = draft.trim();
    setDraft(null);
    if (raw === "") return void save(0);
    const result = evalFormula(raw);
    if (result === null) {
      toast.error("Ongeldige formule");
      return;
    }
    await save(result);
  };

  // Live preview of the typed formula, e.g. "10+20+56" → 86.
  const preview = useMemo(() => {
    if (draft === null) return null;
    const raw = draft.trim();
    if (raw === "" || !/[+\-*/]/.test(raw)) return null;
    const result = evalFormula(raw);
    return result === null ? { valid: false } : { valid: true, result };
  }, [draft]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
          {location}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Min ${location}`}
            onClick={() => void save(qty - 1)}
            className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-transform active:scale-95"
          >
            <Minus className="size-4" />
          </button>
          <input
            type="text"
            inputMode="text"
            placeholder="10+20+56"
            title="Tip: tel op met een formule, bv. 10+20+56"
            value={draft ?? String(qty)}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => {
              setDraft(String(qty));
              e.currentTarget.select();
            }}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setDraft(null);
            }}
            className="h-9 w-24 rounded-lg border border-input bg-background text-center text-sm font-semibold tabular-nums text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            aria-label={`Plus ${location}`}
            onClick={() => void save(qty + 1)}
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      {preview && (
        <div className="mt-1 pl-1 text-right">
          {preview.valid ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
              <span className="opacity-70">{draft} =</span> {preview.result}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">
              Ongeldige formule
            </span>
          )}
        </div>
      )}
    </div>
  );
}