import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, History as HistoryIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDeleteSnapshot, useSnapshots } from "@/hooks/use-snapshots";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [{ title: "Historiek — Stocktelling" }],
  }),
  component: HistoryPage,
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryPage() {
  const { data: snapshots, isLoading } = useSnapshots();
  const del = useDeleteSnapshot();

  const handleDelete = (id: string, label: string) => {
    if (!window.confirm(`"${label}" verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    del.mutate(id, {
      onSuccess: () => toast.success("Telling verwijderd"),
      onError: (err) => toast.error(`Verwijderen mislukt: ${(err as Error).message}`),
    });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-10 md:max-w-3xl md:pb-16">
      <header className="rounded-b-3xl bg-header px-5 pb-8 pt-8 text-header-foreground md:mt-6 md:rounded-3xl md:px-10 md:py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm opacity-75 transition-opacity hover:opacity-100"
        >
          <ArrowLeft className="size-4" />
          Terug
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
          <HistoryIcon className="size-7" />
          Historiek
        </h1>
        <p className="mt-1 text-sm opacity-75">
          Alle bewaarde tellingen — tik een telling om details te bekijken.
        </p>
      </header>

      <section className="space-y-3 px-4 pt-5 md:px-0 md:pt-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !snapshots || snapshots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nog geen tellingen bewaard.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ga terug naar het dashboard en klik op "Bewaar telling" om te beginnen.
            </p>
          </div>
        ) : (
          snapshots.map((s) => (
            <div
              key={s.id}
              className="group flex items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all md:hover:border-primary/40 md:hover:shadow-md"
            >
              <Link
                to="/history/$snapshotId"
                params={{ snapshotId: s.id }}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-card-foreground">
                    {s.label}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(s.taken_at)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
              <button
                onClick={() => handleDelete(s.id, s.label)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Verwijder telling"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
