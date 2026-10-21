"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, FolderOpen, FolderPlus, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ExplorerHeader } from "@/components/explorer/explorer-ui";
import { FOLDERS_CHANGED_EVENT, type SavedFolder } from "@/lib/saved-folders";
import { FolderActionsMenu } from "./folder-actions-menu";
import { FolderNameDialog } from "./folder-name-dialog";
import { createFolder, listFolders } from "./folders-client";

/** /folders: every folder of the user, with create / rename / delete. */
export function FoldersView() {
  const [folders, setFolders] = React.useState<SavedFolder[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    const load = () =>
      listFolders()
        .then((list) => {
          setFolders(list);
          setError(null);
        })
        .catch((err: Error) => setError(err.message));
    load();
    window.addEventListener(FOLDERS_CHANGED_EVENT, load);
    return () => window.removeEventListener(FOLDERS_CHANGED_EVENT, load);
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <ExplorerHeader title="Mes dossiers" icon={<Bookmark className="size-4 text-muted-foreground" />} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight">Mes dossiers</h2>
            <p className="text-sm text-muted-foreground">
              Range les vidéos et les chaînes à étudier. Ajoute-les depuis une carte vidéo ou une page chaîne.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <FolderPlus /> Nouveau dossier
          </Button>
        </div>

        {error && !folders && <EmptyState title="Impossible de charger tes dossiers" description={error} />}

        {!folders && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        )}

        {folders?.length === 0 && (
          <EmptyState
            title="Aucun dossier pour l'instant"
            description="Crée un premier dossier, puis enregistre des vidéos et des chaînes avec le bouton « Enregistrer »."
          >
            <Button onClick={() => setCreateOpen(true)}>
              <FolderPlus /> Créer un dossier
            </Button>
          </EmptyState>
        )}

        {folders && folders.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>
        )}
      </div>

      <FolderNameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nouveau dossier"
        submitLabel="Créer"
        onSubmit={async (name) => {
          await createFolder(name);
        }}
      />
    </div>
  );
}

function FolderCard({ folder }: { folder: SavedFolder }) {
  const previews = folder.previews.slice(0, 4);
  return (
    <Card className="group relative gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md">
      <Link href={`/folders/${folder.id}`} className="flex flex-col">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 [&>img]:min-h-0">
            {previews.length === 0 ? (
              <div className="col-span-2 row-span-2 flex items-center justify-center">
                <FolderOpen className="size-10 text-muted-foreground/60" />
              </div>
            ) : (
              previews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  loading="lazy"
                  className={
                    previews.length === 1
                      ? "col-span-2 row-span-2 size-full object-cover"
                      : previews.length === 2
                        ? "row-span-2 size-full object-cover"
                        : previews.length === 3 && i === 0
                          ? "row-span-2 size-full object-cover"
                          : "size-full object-cover"
                  }
                />
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 p-3.5 pr-12">
          <p className="truncate font-medium">{folder.name}</p>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Video className="size-3" /> {folder.videoCount} vidéo{folder.videoCount > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" /> {folder.channelCount} chaîne{folder.channelCount > 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </Link>
      <div className="absolute right-2 bottom-3">
        <FolderActionsMenu folder={folder} />
      </div>
    </Card>
  );
}
