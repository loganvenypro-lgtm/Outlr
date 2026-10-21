"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderNameDialog } from "./folder-name-dialog";
import { deleteFolder, renameFolder } from "./folders-client";

/** "…" menu of a folder: rename it, or delete it after a confirmation. */
export function FolderActionsMenu({
  folder,
  onDeleted,
  triggerClassName,
}: {
  folder: { id: string; name: string };
  onDeleted?: () => void;
  triggerClassName?: string;
}) {
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const confirmDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteFolder(folder.id);
      setDeleteOpen(false);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions du dossier ${folder.name}`}
          render={<Button variant="ghost" size="icon-sm" className={triggerClassName} />}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil /> Renommer
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FolderNameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Renommer le dossier"
        submitLabel="Renommer"
        initialName={folder.name}
        onSubmit={(name) => renameFolder(folder.id, name)}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {folder.name} » ?</DialogTitle>
            <DialogDescription>
              Le dossier et tout ce qui y est enregistré seront supprimés. Les vidéos et chaînes elles-mêmes restent dans
              Outlr.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
