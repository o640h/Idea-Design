"use client";

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  fetchOperations,
  SaveError,
  SNAPSHOT_INTERVAL,
  saveSnapshot,
  sendEntry,
} from "@/lib/concepts/database";
import {
  type EditorAction,
  type EditorState,
  editorReducer,
} from "@/lib/concepts/editor";
import type { ConceptId } from "@/lib/concepts/model";
import type { Operation } from "@/lib/concepts/operations";
import * as outbox from "@/lib/concepts/outbox";
import { createClient } from "@/lib/supabase/client";

const SAVE_DELAY_MS = 800;
const MAX_RETRY_MS = 30_000;

export interface SessionBranch {
  id: string;
  title: string;
  editor: EditorState;
}

export interface SessionConcept {
  id: ConceptId;
  /** Main's saved title, shown until the concept is opened. */
  title: string;
  deletedAt: string | null;
  mainBranchId: string;
  /** Main first; null until the concept is opened. Only Main is saved. */
  branches: SessionBranch[] | null;
}

export type SaveStatus = "saved" | "saving" | "failed";

/** Applies an editor action to each opened concept's Main branch. */
export function updateMain(
  concepts: SessionConcept[],
  action: EditorAction,
  conceptId?: ConceptId,
) {
  return concepts.map((concept) => {
    const [main, ...alternatives] = concept.branches ?? [];

    if (!main || (conceptId && concept.id !== conceptId)) {
      return concept;
    }

    return {
      ...concept,
      branches: [
        { ...main, editor: editorReducer(main.editor, action) },
        ...alternatives,
      ],
    };
  });
}

/**
 * Saves each opened concept's Main branch through the IndexedDB outbox and
 * pulls operations made elsewhere, after edits and whenever the tab regains
 * focus or connection.
 */
export function useSync(
  concepts: SessionConcept[],
  setConcepts: Dispatch<SetStateAction<SessionConcept[]>>,
) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [leftOver, setLeftOver] = useState<outbox.OutboxEntry[]>([]);
  const latest = useRef(concepts);
  const written = useRef(new Map<string, Operation[]>());
  const snapshotSeqs = useRef(new Map<string, number>());
  const timer = useRef<number>(undefined);
  const running = useRef(false);
  const rerun = useRef(false);
  const failures = useRef(0);

  async function pull() {
    const supabase = createClient();

    for (const concept of latest.current) {
      const main = concept.branches?.[0];

      if (!main) {
        continue;
      }

      const rows = await fetchOperations(supabase, main.id, main.editor.seq);

      if (!rows.length) {
        continue;
      }

      flushSync(() =>
        setConcepts((current) =>
          updateMain(current, { type: "sync/pull", rows }, concept.id),
        ),
      );

      const { editor } =
        latest.current.find(({ id }) => id === concept.id)?.branches?.[0] ??
        main;
      const snapshotSeq = snapshotSeqs.current.get(main.id) ?? main.editor.seq;

      if (editor.seq - snapshotSeq >= SNAPSHOT_INTERVAL) {
        snapshotSeqs.current.set(main.id, editor.seq);
        await saveSnapshot(
          supabase,
          main.id,
          editor.seq,
          editor.confirmed,
        ).catch((error) => console.warn("Snapshot not saved", error));
      } else {
        snapshotSeqs.current.set(main.id, snapshotSeq);
      }
    }
  }

  /** Sends this tab's outbox in order, then pulls. */
  async function sync() {
    window.clearTimeout(timer.current);

    if (running.current) {
      rerun.current = true;
      return;
    }

    running.current = true;

    try {
      let dropped = false;

      do {
        rerun.current = false;
        // Edits made while sending start new changes instead of growing
        // ones already on their way.
        flushSync(() =>
          setConcepts((current) => updateMain(current, { type: "sync/seal" })),
        );

        for (const entry of await outbox.own()) {
          setStatus("saving");

          try {
            await sendEntry(createClient(), entry);
          } catch (error) {
            if (!(error instanceof SaveError && error.permanent)) {
              throw error;
            }

            console.error("Change rejected and discarded", entry, error);
            dropped = true;
          }

          await outbox.remove(entry.id);
          written.current.delete(entry.id);
        }
      } while (rerun.current);

      failures.current = 0;
      setStatus(dropped ? "failed" : "saved");
    } catch (error) {
      console.warn("Save failed; retrying", error);
      failures.current += 1;
      setStatus("failed");
      timer.current = window.setTimeout(
        sync,
        Math.min(MAX_RETRY_MS, 1000 * 2 ** failures.current),
      );
    } finally {
      running.current = false;
    }

    await pull().catch((error) => console.warn("Pull failed", error));
  }

  // Writes each unsealed change to the outbox as soon as it exists, so a
  // closed tab loses nothing, and sends once editing pauses.
  useLayoutEffect(() => {
    latest.current = concepts;
    let wrote = false;

    for (const concept of concepts) {
      const main = concept.branches?.[0];

      for (const change of main?.editor.pending.slice(main.editor.sealed) ??
        []) {
        if (main && written.current.get(change.id) !== change.operations) {
          written.current.set(change.id, change.operations);
          void outbox.put({
            kind: "change",
            id: change.id,
            branchId: main.id,
            operations: change.operations,
          });
          wrote = true;
        }
      }
    }

    if (wrote) {
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(sync, SAVE_DELAY_MS);
    }
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: sync reads only refs and stable setters, so listeners added once stay valid
  useEffect(() => {
    void outbox.orphans().then(setLeftOver);

    function syncWhenVisible() {
      if (document.visibilityState === "visible") {
        void sync();
      }
    }

    const syncNow = () => void sync();
    window.addEventListener("focus", syncNow);
    window.addEventListener("online", syncNow);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.removeEventListener("focus", syncNow);
      window.removeEventListener("online", syncNow);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.clearTimeout(timer.current);
    };
  }, []);

  return {
    status,
    /** Writes left in the outbox by a session that closed before saving. */
    leftOver: leftOver.length,
    /** Queues a write that is not an editor change, and sends it soon. */
    enqueue(entry: outbox.OutboxEntry) {
      void outbox.put(entry);
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(sync, SAVE_DELAY_MS);
    },
    retry: () => void sync(),
    async applyLeftOver() {
      await outbox.adopt(leftOver);
      await sync();
      // Left-over writes may add or change concepts this page has not
      // loaded, so start again from the server.
      window.location.reload();
    },
    async discardLeftOver() {
      await Promise.all(leftOver.map(({ id }) => outbox.remove(id)));
      setLeftOver([]);
    },
  };
}
