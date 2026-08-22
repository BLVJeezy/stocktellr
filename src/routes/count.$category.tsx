import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  History,
  ImageIcon,
  ImagePlus,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  addItem,
  deleteItem,
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
import { evalFormula, getCategory, type Category } from "@/lib/inventory";
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
        <div className="relative mt-3 md:mt-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek artikel..."
            className="w-full rounded-xl bg-white/10 py-2.5 pl-9 pr-3 text-sm text-header-foreground placeholder:text-header-foreground/50 outline-none ring-primary/60 focus:ring-2"
          />
        </div>
      </header>

      <section className="space-y-3 px-3 pt-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 md:px-8 md:pt-6 xl:grid-cols-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground md:col-span-full">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground md:col-span-full">
            Geen artikelen gevonden.
          </p>
        ) : (
          items.map((item) => {
            const total = cat.locations.reduce((s, loc) => s + qtyOf(item.id, loc), 0);
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-border bg-card p-3.5 md:flex md:flex-col md:p-4 md:transition-shadow md:hover:shadow-md"
              >
                <ItemImage itemId={item.id} name={item.name} imageUrl={item.image_url} />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-card-foreground">
                      {item.name}
                    </h2>
                    <span className="mt-1 inline-block rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      {item.unit}
                    </span>
                  </div>
                  <DoneToggle itemId={item.id} done={item.done} />
                </div>

                <div className="mt-3 space-y-2 md:flex-1">
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

                <div className="mt-2 flex items-center gap-2">
                  <CommentButton itemId={item.id} name={item.name} comment={item.comment} />
                  <DeleteItemButton itemId={item.id} name={item.name} />
                </div>
              </article>
            );
          })
        )}
      </section>

      <AddItemBar category={category} units={cat.units} />
    </main>
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
}: {
  itemId: string;
  location: string;
  qty: number;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, load: loadHistory, remember } = useFormulaHistory(itemId, location);

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
    if (raw === "") {
      setDraft(null);
      setError(null);
      setShowHistory(false);
      return void save(0);
    }
    const result = evalFormula(raw);
    if (result === null) {
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
    await save(result);
  };

  // Live preview of the typed formula, e.g. "10+20+56" → 86.
  const preview = useMemo(() => {
    const raw = (draft ?? "").trim();
    if (raw === "" || !/[+\-*/(]/.test(raw)) return null;
    const result = evalFormula(raw);
    return result === null ? { valid: false } : { valid: true, result };
  }, [draft]);

  const showError = error ?? (preview && !preview.valid ? "Ongeldige formule — controleer de tekens" : null);
  const liveTotal = preview?.valid ? preview.result : qty;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="w-14 shrink-0 truncate text-xs font-medium text-muted-foreground">
            {location}
          </span>
          <button
            type="button"
            aria-label={`Min ${location}`}
            onClick={() => {
              setError(null);
              setDraft(null);
              void save(qty - 1);
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-transform active:scale-95"
          >
            <Minus className="size-4" />
          </button>
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            aria-invalid={showError ? true : undefined}
            placeholder="10+20+56"
            title="Tip: tel op met een formule, bv. 10+20+56"
            value={draft ?? String(qty)}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onFocus={(e) => {
              setDraft(String(qty));
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
              "h-9 w-20 min-w-0 flex-1 rounded-lg border bg-background text-center text-sm font-semibold tabular-nums text-foreground outline-none transition-colors focus:ring-2 " +
              (showError
                ? "border-destructive text-destructive ring-2 ring-destructive/30 focus:border-destructive focus:ring-destructive/40"
                : "border-input focus:border-ring focus:ring-ring/30")
            }
          />
          <button
            type="button"
            aria-label={`Plus ${location}`}
            onClick={() => {
              setError(null);
              setDraft(null);
              void save(qty + 1);
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex shrink-0 flex-col items-end rounded-lg bg-secondary/50 px-2.5 py-1 leading-tight">
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Totaal
          </span>
          <span className="text-sm font-bold tabular-nums text-card-foreground">
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