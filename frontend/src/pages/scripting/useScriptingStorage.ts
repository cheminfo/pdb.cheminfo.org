import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadText } from 'react-cheminfo/core';
import { useDebouncedValue } from 'react-cheminfo/ui';

import type { BackupData, PersistedScene, Revision } from './db.ts';
import {
  addRevision,
  deleteProtein,
  exportAll,
  getAutoSave,
  getProteinScenes,
  getRevisions,
  listProteinIds,
  mergeImport,
  normalizePdbId,
  setAutoSave,
  setProteinScenes,
} from './db.ts';
import { scenesForProtein } from './scenes.ts';

/** ms between the last keystroke and an auto-save write */
const AUTO_SAVE_DEBOUNCE_MS = 2000;

/**
 * Built-in scenes a protein starts with, in persisted form. Only the demo
 * protein gets the 8ZXR-specific teaching set; anything else starts from the
 * generic global view.
 * @param pdbId - Four-character PDB identifier.
 */
function defaultScenes(pdbId: string): PersistedScene[] {
  return scenesForProtein(pdbId).map((s) => ({
    id: s.id,
    label: s.label,
    code: s.code,
    createdAt: 0,
  }));
}

export interface ScriptingStorage {
  /** Scene buttons shown for the current protein. */
  scenes: PersistedScene[];
  /** Every protein with stored scripts, sorted — drives the protein menu. */
  proteinIds: string[];
  /**
   * Bumped whenever this protein's stored data is replaced from outside the
   * editor (an import). Callers that mirror `loadedCode` into their own state
   * should treat a change here as "reseed from storage".
   */
  reloadToken: number;
  /** Saved revisions for the current protein, newest first. */
  revisions: Revision[];
  /**
   * Code that was auto-saved the last time this protein was open.
   * `null` when the protein has never been opened before.
   */
  loadedCode: string | null;
  /** True once IndexedDB has responded (scenes + auto-save are ready). */
  storageReady: boolean;
  /** Add the current editor code as a named scene for this protein. */
  addScene: (label: string, code: string) => Promise<void>;
  /** Remove a scene by its ID. */
  removeScene: (id: string) => Promise<void>;
  /** Persist the current code as a timestamped revision. */
  saveRevision: (label: string, code: string) => Promise<number>;
  /**
   * Register a protein and seed it with its built-in scenes. Does nothing if
   * it is already known, so an existing protein's scripts are never clobbered.
   */
  addProtein: (pdbId: string) => Promise<void>;
  /** Delete every script, revision and auto-save belonging to a protein. */
  removeProtein: (pdbId: string) => Promise<void>;
  /** Download a JSON file containing every stored record, for every protein. */
  exportBackup: () => Promise<void>;
  /**
   * Merge a previously exported JSON file into the database: proteins it
   * carries replace the local copy, proteins it omits are kept.
   */
  importBackup: (file: File) => Promise<BackupData>;
}

/**
 * Manages all IndexedDB persistence for the Scripting page.
 *
 * - Loads and initialises the scene list when `pdbId` changes.
 * - Auto-saves `code` to IndexedDB after a debounce delay.
 * - Exposes methods for manual save, scene management, and backup.
 * @param pdbId - The currently loaded protein identifier.
 * @param code - The current editor content (watched for auto-save).
 */
export function useScriptingStorage(
  pdbId: string,
  code: string,
): ScriptingStorage {
  const [scenes, setScenesState] = useState<PersistedScene[]>([]);
  const [proteinIds, setProteinIds] = useState<string[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loadedCode, setLoadedCode] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  // Avoid saving immediately on mount before we've finished loading.
  const autoSaveEnabled = useRef(false);

  // The protein list spans every protein, so it must not be reloaded by the
  // per-protein effect below — only when the set of proteins actually changes.
  const refreshProteinIds = useCallback(async () => {
    setProteinIds(await listProteinIds());
  }, []);

  // Load from IndexedDB whenever the protein changes.
  useEffect(() => {
    autoSaveEnabled.current = false;
    let cancelled = false;

    // Defer the "loading" flag to a microtask so it isn't synchronous in the
    // effect body — satisfies the set-state-in-effect lint rule.
    void Promise.resolve().then(() => {
      if (!cancelled) setStorageReady(false);
    });

    async function load() {
      const [storedScenes, autoSave, revs] = await Promise.all([
        getProteinScenes(pdbId),
        getAutoSave(pdbId),
        getRevisions(pdbId),
      ]);
      if (cancelled) return;

      // First visit for this protein → seed with built-in defaults, which also
      // registers it in the protein menu.
      const initialScenes = storedScenes ?? defaultScenes(pdbId);
      if (!storedScenes) {
        await setProteinScenes(pdbId, initialScenes);
      }

      setScenesState(initialScenes);
      setLoadedCode(autoSave?.code ?? null);
      setRevisions(revs);
      setStorageReady(true);
      autoSaveEnabled.current = true;
      // Also populates the menu on mount. Arriving on a protein for the first
      // time registers it, so the list can change on any protein switch.
      await refreshProteinIds();
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pdbId, reloadToken, refreshProteinIds]);

  // Debounced auto-save whenever code changes.
  const debouncedCode = useDebouncedValue(code, AUTO_SAVE_DEBOUNCE_MS);
  useEffect(() => {
    if (!autoSaveEnabled.current) return;
    void setAutoSave({ pdbId, code: debouncedCode, updatedAt: Date.now() });
  }, [pdbId, debouncedCode]);

  const addScene = useCallback(
    async (label: string, sceneCode: string) => {
      const scene: PersistedScene = {
        id: `custom-${Date.now()}`,
        label,
        code: sceneCode,
        createdAt: Date.now(),
      };
      const updated = [...scenes, scene];
      await setProteinScenes(pdbId, updated);
      setScenesState(updated);
    },
    [pdbId, scenes],
  );

  const removeScene = useCallback(
    async (id: string) => {
      const updated = scenes.filter((s) => s.id !== id);
      await setProteinScenes(pdbId, updated);
      setScenesState(updated);
    },
    [pdbId, scenes],
  );

  const saveRevision = useCallback(
    async (label: string, revCode: string) => {
      const revision = { pdbId, label, code: revCode, savedAt: Date.now() };
      const id = await addRevision(revision);
      setRevisions((prev) => [{ ...revision, id }, ...prev]);
      return id;
    },
    [pdbId],
  );

  const addProtein = useCallback(
    async (newPdbId: string) => {
      const id = normalizePdbId(newPdbId);
      if (!id) return;
      // Never overwrite scripts the user already has for this protein.
      const existing = await getProteinScenes(id);
      if (!existing) await setProteinScenes(id, defaultScenes(id));
      await refreshProteinIds();
    },
    [refreshProteinIds],
  );

  const removeProtein = useCallback(
    async (targetPdbId: string) => {
      await deleteProtein(targetPdbId);
      await refreshProteinIds();
      // Reload the open protein: if it was the one deleted, this re-seeds it
      // from its built-in scenes rather than leaving deleted data on screen.
      setReloadToken((token) => token + 1);
    },
    [refreshProteinIds],
  );

  const exportBackup = useCallback(async () => {
    const data = await exportAll();
    downloadText(
      JSON.stringify(data, null, 2),
      `pdb-scripting-backup-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json',
    );
  }, []);

  const importBackup = useCallback(
    async (file: File) => {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      await mergeImport(data);
      await refreshProteinIds();
      // Force a reload of the open protein: the import may have replaced its
      // auto-save, and the editor would otherwise write its stale copy back.
      setReloadToken((token) => token + 1);
      return data;
    },
    [refreshProteinIds],
  );

  return {
    scenes,
    proteinIds,
    reloadToken,
    revisions,
    loadedCode,
    storageReady,
    addScene,
    removeScene,
    saveRevision,
    addProtein,
    removeProtein,
    exportBackup,
    importBackup,
  };
}
