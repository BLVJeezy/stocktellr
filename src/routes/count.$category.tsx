import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckSquare,
  History,
  ImageIcon,
  ImagePlus,
  Loader2,
  MessageSquare,
  Minus,
  Pencil,
  Plus,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  addItem,
  deleteItem,
  deleteItems,
  moveItemsToCategory,
  renameItems,
  setCount,
  setItemComment,
  setItemDone,
  uploadItemImage,
  useInventory,
} from "@/hooks/use-inventory";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORIES, evalFormula, getCategory, type Category, type Item } from "@/lib/inventory";
import { useFormulaHistory } from "@/lib/formula-history";

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"alle" | "nog_te_doen" | "gedaan">("alle");
  const [unitFilter, setUnitFilter] = useState<"alle" | "LOS" | "DOOS">("alle");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const items = useMemo(() => {
    const list = (data?.items ?? [])
      .filter((i) => i.category === category)
      .sort((a, b) => a.sort_order - b.sort_order);
    const q = search.trim().toLowerCase();
    return q ? list.filter((i) => i.name.toLowerCase().includes(q)) : list;
  }, [data, category, search]);

  // Group LOS/DOOS variants of the same product into one card.
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const arr = map.get(item.name);
      if (arr) arr.push(item);
      else map.set(item.name, [item]);
    }
    return Array.from(map.entries()).map(([name, units]) => ({
      name,
      units: units.sort((a, b) => {
        const unitRank = (u: string) => (u.toUpperCase() === "LOS" ? 0 : 1);
        return unitRank(a.unit) - unitRank(b.unit) || a.sort_order - b.sort_order;
      }),
    }));
  }, [items]);

  const counts = data?.counts ?? [];
  const qtyOf = (itemId: string, loc: string) =>
    counts.find((c) => c.item_id === itemId && c.location === loc)?.qty ?? 0;
  const formulaOf = (itemId: string, loc: string) =>
    counts.find((c) => c.item_id === itemId && c.location === loc)?.formula ?? null;

  const filteredGroups = groups
    .map((g) => {
      if (unitFilter === "alle") return g;
      const units = g.units.filter((u) => u.unit.toUpperCase() === unitFilter);
      return units.length > 0 ? { ...g, units } : null;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .filter((g) => {
      if (filter === "alle") return true;
      const allDone = g.units.every((u) => u.done);
      return filter === "gedaan" ? allDone : !allDone;
    });

  const toggleSelect = (groupName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size} product(en) verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    setDeleting(true);
    try {
      const idsToDelete = groups
        .filter((g) => selected.has(g.name))
        .flatMap((g) => g.units.map((u) => u.id));
      await deleteItems(idsToDelete);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`${selected.size} product(en) verwijderd`);
      setSelected(new Set());
      setSelectMode(false);
    } catch {
      toast.error("Verwijderen mislukt");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28 md:max-w-6xl">
      <header className="sticky top-0 z-10 rounded-b-2xl bg-header px-4 pb-4 pt-5 text-header-foreground shadow-sm md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-center md:gap-6 md:px-8 md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20 active:bg-white/20"
            aria-label="Terug naar dashboard"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight md:text-2xl">{cat.name}</h1>
            <p className="truncate text-xs opacity-70">{cat.locations.join(" · ")}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 md:mt-0">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek artikel..."
              className="w-full rounded-xl bg-white/10 py-2.5 pl-9 pr-3 text-sm text-header-foreground placeholder:text-header-foreground/50 outline-none ring-primary/60 focus:ring-2"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
            className={
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors " +
              (selectMode
                ? "bg-white text-header"
                : "bg-white/10 text-header-foreground hover:bg-white/20")
            }
          >
            {selectMode ? <X className="size-4" /> : <CheckSquare className="size-4" />}
            <span className="hidden sm:inline">{selectMode ? "Annuleer" : "Selecteer"}</span>
          </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto px-3 pt-3 md:px-8">
        {(
          [
            { key: "alle", label: "Alle" },
            { key: "nog_te_doen", label: "Nog te doen" },
            { key: "gedaan", label: "Gedaan" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors " +
              (filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto px-3 pt-2 md:px-8">
        {(
          [
            { key: "alle", label: "Los + Doos" },
            { key: "LOS", label: "Los" },
            { key: "DOOS", label: "Doos" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setUnitFilter(f.key)}
            className={
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors " +
              (unitFilter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-transparent text-muted-foreground hover:bg-secondary/50")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="space-y-3 px-3 pt-4 md:mx-auto md:grid md:max-w-6xl md:grid-cols-2 md:gap-4 md:space-y-0 md:px-8 md:pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground md:col-span-full">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground md:col-span-full">
            Geen artikelen gevonden.
          </p>
        ) : (
          filteredGroups.map((group) => (
            <ProductGroupCard
              key={group.name}
              group={group}
              categoryKey={category}
              locations={cat.locations}
              qtyOf={qtyOf}
              formulaOf={formulaOf}
              selectMode={selectMode}
              selected={selected.has(group.name)}
              onToggleSelect={() => toggleSelect(group.name)}
            />
          ))
        )}
      </section>

      {selectMode && selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 md:max-w-6xl">
            <span className="flex-1 text-sm font-medium text-foreground">
              {selected.size} geselecteerd
            </span>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleBulkDelete()}
              className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Verwijder
            </button>
          </div>
        </div>
      ) : (
        <AddItemBar category={category} units={cat.units} />
      )}
    </main>
  );
}

function ProductGroupCard({
  group,
  categoryKey,
  locations,
  qtyOf,
  formulaOf,
  selectMode,
  selected,
  onToggleSelect,
}: {
  group: { name: string; units: Item[] };
  categoryKey: string;
  locations: string[];
  qtyOf: (itemId: string, loc: string) => number;
  formulaOf: (itemId: string, loc: string) => string | null;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const firstWithImage = group.units.find((u: Item) => u.image_url) ?? group.units[0]!;
  const multiUnit = group.units.length > 1;

  return (
    <article
      onClick={selectMode ? onToggleSelect : undefined}
      className={
        "rounded-2xl border bg-card p-4 transition-all md:p-5 " +
        (selectMode ? "cursor-pointer active:scale-[0.99] " : "") +
        (selected ? "border-primary ring-2 ring-primary/40" : "border-border")
      }
    >
      <div className="flex items-start gap-3">
        {selectMode ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            aria-label="Selecteer product"
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-input text-primary"
          >
            {selected ? <CheckSquare className="size-5 fill-primary/10" /> : <Square className="size-5" />}
          </button>
        ) : null}
        <ItemImage
          itemId={firstWithImage.id}
          name={group.name}
          imageUrl={firstWithImage.image_url}
        />
      </div>

      <div className="mt-1 flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-base font-bold text-card-foreground md:text-lg">
          {group.name}
        </h2>
        {!selectMode ? (
          <EditProductButton
            categoryKey={categoryKey}
            group={group}
          />
        ) : null}
      </div>

      <div className={"mt-3 grid gap-3 " + (multiUnit ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
        {group.units.map((unit: Item) => {
          const total = locations.reduce((s, loc) => s + qtyOf(unit.id, loc), 0);
          return (
            <div
              key={unit.id}
              className={
                "rounded-xl p-3 md:p-4 " + (multiUnit ? "border-2 border-border bg-secondary/20" : "")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-block rounded-md bg-secondary px-2 py-1 text-xs font-bold uppercase tracking-wide text-secondary-foreground md:text-sm">
                  {unit.unit}
                </span>
                {!selectMode ? <DoneToggle itemId={unit.id} done={unit.done} /> : null}
              </div>

              <div className="mt-2.5 space-y-2.5">
                {locations.map((loc) => (
                  <LocationRow
                    key={loc}
                    itemId={unit.id}
                    location={loc}
                    qty={qtyOf(unit.id, loc)}
                    formula={formulaOf(unit.id, loc)}
                    multiplier={unit.units_per_pack ?? 1}
                    packLabel={unit.pack_size}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Totaal
                </span>
                <span className="text-lg font-bold tabular-nums text-card-foreground">
                  {total}{" "}
                  <span className="text-xs font-medium text-muted-foreground">{unit.unit}</span>
                </span>
              </div>

              {!selectMode ? (
                <div className="mt-2 flex items-center gap-2">
                  <CommentButton itemId={unit.id} name={`${group.name} (${unit.unit})`} comment={unit.comment} />
                  <DeleteItemButton itemId={unit.id} name={`${group.name} (${unit.unit})`} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function EditProductButton({
  categoryKey,
  group,
}: {
  categoryKey: string;
  group: { name: string; units: Item[] };
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [targetCategory, setTargetCategory] = useState(categoryKey);
  const [saving, setSaving] = useState(false);

  const itemIds = group.units.map((u) => u.id);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (trimmed !== group.name) {
        await renameItems(itemIds, trimmed);
      }
      const categoryChanged = targetCategory !== categoryKey;
      if (categoryChanged) {
        await moveItemsToCategory(itemIds, targetCategory);
      }
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Product bijgewerkt");
      setOpen(false);
      if (categoryChanged) {
        void navigate({ to: "/count/$category", params: { category: targetCategory } });
      }
    } catch {
      toast.error("Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName(group.name);
          setTargetCategory(categoryKey);
          setOpen(true);
        }}
        aria-label={`Bewerk ${group.name}`}
        className="flex shrink-0 items-center justify-center rounded-lg bg-secondary p-2 text-secondary-foreground transition-colors hover:bg-secondary/80"
      >
        <Pencil className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Product bewerken</DialogTitle>
            <DialogDescription>Titel aanpassen of naar een andere categorie verplaatsen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Titel</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Categorie</label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Opslaan
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddItemBar({ category, units }: { category: string; units: string[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(units[0] ?? "LOS");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await addItem(category, trimmed, unit);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Product toegevoegd");
      setName("");
      setOpen(false);
    } catch {
      toast.error("Toevoegen mislukt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-3 py-3 backdrop-blur md:px-8">
        <div className="mx-auto w-full max-w-md md:max-w-6xl">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.99]"
          >
            <Plus className="size-4" /> Nieuw product toevoegen
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nieuw product</DialogTitle>
            <DialogDescription>Voeg een artikel toe aan deze categorie.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Naam</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
                placeholder="bv. Croky Chips Naturel 150g"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Eenheid</label>
              <div className="flex flex-wrap gap-1.5">
                {units.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={
                      "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors " +
                      (unit === u
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground")
                    }
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={saving || !name.trim()}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Toevoegen
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DoneToggle({ itemId, done }: { itemId: string; done: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await setItemDone(itemId, !done);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    } catch {
      toast.error("Bijwerken mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={done}
      className={
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 " +
        (done
          ? "bg-success text-success-foreground"
          : "bg-pending text-pending-foreground hover:bg-pending/80")
      }
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
      {done ? "Gedaan" : "Nog te doen"}
    </button>
  );
}

function CommentButton({
  itemId,
  name,
  comment,
}: {
  itemId: string;
  name: string;
  comment: string | null;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(comment ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await setItemComment(itemId, text);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Comment opgeslagen");
      setOpen(false);
    } catch {
      toast.error("Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setText(comment ?? "");
          setOpen(true);
        }}
        className={
          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors " +
          (comment
            ? "bg-primary/10 text-primary hover:bg-primary/15"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80")
        }
      >
        <MessageSquare className="size-3.5" />
        {comment ? "Comment" : "Comment toevoegen"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Comment</DialogTitle>
            <DialogDescription>{name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Opmerking over dit product..."
              rows={4}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Opslaan
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteItemButton({ itemId, name }: { itemId: string; name: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`"${name}" verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    setBusy(true);
    try {
      await deleteItem(itemId);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Product verwijderd");
    } catch {
      toast.error("Verwijderen mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={busy}
      aria-label={`Verwijder ${name}`}
      className="flex shrink-0 items-center justify-center rounded-lg bg-destructive/10 px-3 py-2 text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}

function ItemImage({
  itemId,
  name,
  imageUrl,
}: {
  itemId: string;
  name: string;
  imageUrl: string | null;
}) {
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadItemImage(itemId, file);
      setFailed(false);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Foto bijgewerkt");
    } catch {
      toast.error("Uploaden mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mb-3 flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-secondary/40">
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="h-full w-full object-contain p-2"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageIcon className="size-8 text-muted-foreground/50" />
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="absolute bottom-1.5 right-1.5 flex gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          aria-label={`Foto maken voor ${name}`}
          className="flex size-8 items-center justify-center rounded-lg bg-card/90 text-card-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-card disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
          aria-label={`Foto kiezen uit galerij voor ${name}`}
          className="flex size-8 items-center justify-center rounded-lg bg-card/90 text-card-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-card disabled:opacity-60"
        >
          <ImagePlus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function LocationRow({
  itemId,
  location,
  qty,
  formula,
  multiplier = 1,
  packLabel,
}: {
  itemId: string;
  location: string;
  qty: number;
  formula: string | null;
  multiplier?: number;
  packLabel?: string | null;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, load: loadHistory, remember } = useFormulaHistory(itemId, location);
  const mult = multiplier && multiplier > 0 ? multiplier : 1;

  const save = async (next: number, rawFormula: string | null) => {
    const value = Number.isFinite(next) && next > 0 ? next : 0;
    try {
      await setCount(itemId, location, value, rawFormula);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    } catch {
      toast.error("Opslaan mislukt");
    }
  };

  const commit = async () => {
    if (draft === null) return;
    const raw = draft.trim();
    if (raw === "") {
      setDraft(null);
      setError(null);
      setShowHistory(false);
      return void save(0, null);
    }
    const typed = evalFormula(raw);
    if (typed === null) {
      // Keep the typed text visible and marked invalid so the user can correct it.
      setError(`"${raw}" is geen geldige formule. Gebruik alleen cijfers en + - * / ( )`);
      // Re-focus so the user can fix it immediately without losing their place.
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    setDraft(null);
    setError(null);
    remember(raw);
    setShowHistory(false);
    // The typed number is "packs" (bv. 1 doos) — multiply by the known units per pack,
    // so the stored total is real units. The box itself keeps showing the raw typed formula.
    await save(typed * mult, raw);
  };

  // Live preview of the typed formula, e.g. "10+20+56" → 86.
  const preview = useMemo(() => {
    const raw = (draft ?? "").trim();
    if (raw === "" || !/[+\-*/(]/.test(raw)) return null;
    const result = evalFormula(raw);
    return result === null ? ({ valid: false } as const) : ({ valid: true, result } as const);
  }, [draft]);

  const showError = error ?? (preview && !preview.valid ? "Ongeldige formule — controleer de tekens" : null);
  const liveTotal = preview?.valid ? preview.result * mult : qty;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {location}
        </span>
        {mult > 1 ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            1 = {mult} st.
          </span>
        ) : null}
      </div>
      <div className="flex items-stretch gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-input bg-background pl-1">
          <button
            type="button"
            aria-label={`Min ${location}`}
            onClick={() => {
              setError(null);
              setDraft(null);
              void save(qty - 1, null);
            }}
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-transform active:scale-95"
          >
            <Minus className="size-4" />
          </button>
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            aria-invalid={showError ? true : undefined}
            placeholder="Formule, bv. 10+20+56"
            title="Tip: tel op met een formule, bv. 10+20+56"
            value={draft ?? (formula ?? String(qty))}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onFocus={(e) => {
              setDraft(formula ?? String(qty));
              setError(null);
              loadHistory();
              setShowHistory(true);
              e.currentTarget.select();
            }}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setDraft(null);
                setError(null);
                setShowHistory(false);
                e.currentTarget.blur();
              }
            }}
            className={
              "h-10 min-w-0 flex-1 border-0 bg-transparent px-1 text-center text-sm font-semibold tabular-nums text-foreground outline-none " +
              (showError ? "text-destructive" : "")
            }
          />
          <button
            type="button"
            aria-label={`Plus ${location}`}
            onClick={() => {
              setError(null);
              setDraft(null);
              void save(qty + 1, null);
            }}
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/30 bg-primary/10 leading-tight">
          <span className="text-[9px] font-medium uppercase tracking-wide text-primary/70">
            Totaal
          </span>
          <span className="text-base font-bold tabular-nums text-primary">
            {liveTotal}
          </span>
        </div>
      </div>
      {preview?.valid && !showError ? (
        <div className="mt-1 pl-1 text-right">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
            <span className="opacity-70">{draft} =</span> {preview.result}
          </span>
        </div>
      ) : showError ? (
        <div className="mt-1 flex items-center justify-end gap-1 px-1 text-right">
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
            <AlertCircle className="size-3 shrink-0" /> {showError}
          </span>
        </div>
      ) : null}
      {showHistory && history.length > 0 ? (
        <div className="mt-1 flex flex-wrap items-center justify-end gap-1 px-1">
          <History className="size-3 shrink-0 text-muted-foreground" />
          {history.map((f) => (
            <button
              key={f}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDraft(f);
                setError(null);
                inputRef.current?.focus();
              }}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-secondary-foreground transition-transform active:scale-95"
            >
              {f}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}