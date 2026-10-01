import { createStore, del, entries, set, type UseStore } from "idb-keyval";
import type { Operation } from "./operations";

/** A write waiting to reach the server, kept in IndexedDB until it does. */
export type OutboxEntry =
  | {
      kind: "concept";
      id: string;
      conceptId: string;
      workspaceId: string;
      branchId: string;
    }
  | { kind: "change"; id: string; branchId: string; operations: Operation[] }
  | { kind: "trash"; id: string; conceptId: string; deletedAt: string | null }
  | { kind: "delete"; id: string; conceptId: string };

type StoredEntry = OutboxEntry & { tabId: string; order: number };

const tabId = crypto.randomUUID();
const orders = new Map<string, number>();
let nextOrder = Date.now();
let store: UseStore | undefined;
let queue: Promise<unknown> = Promise.resolve();

function lockName(owner: string) {
  return `idea-design-tab:${owner}`;
}

function outbox() {
  if (!store) {
    store = createStore("idea-design", "outbox");
    // Held until the tab closes, so entries left by closed tabs can be told
    // apart from those another open tab is still saving.
    void navigator.locks.request(lockName(tabId), () => new Promise(() => {}));
  }

  return store;
}

/** Runs IndexedDB work in order, so a later read sees every earlier write. */
function enqueue<T>(task: () => Promise<T>) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

async function stored() {
  const all = await entries<string, StoredEntry>(outbox());
  return all.map(([, entry]) => entry).sort((a, b) => a.order - b.order);
}

/** Adds or replaces an entry, keeping its place in the queue. */
export function put(entry: OutboxEntry) {
  const order = orders.get(entry.id) ?? nextOrder++;
  orders.set(entry.id, order);
  return enqueue(() => set(entry.id, { ...entry, tabId, order }, outbox()));
}

export function remove(id: string) {
  orders.delete(id);
  return enqueue(() => del(id, outbox()));
}

/** This tab's entries in the order they were made. */
export function own(): Promise<OutboxEntry[]> {
  return enqueue(async () =>
    (await stored()).filter((entry) => entry.tabId === tabId),
  );
}

/** Entries left by tabs that closed before saving them. */
export function orphans(): Promise<OutboxEntry[]> {
  return enqueue(async () => {
    const { held = [] } = await navigator.locks.query();
    const open = new Set(held.map(({ name }) => name));
    return (await stored()).filter(
      (entry) => entry.tabId !== tabId && !open.has(lockName(entry.tabId)),
    );
  });
}

/** Makes left-over entries this tab's to save, keeping their order. */
export function adopt(adopted: OutboxEntry[]) {
  return enqueue(async () => {
    for (const entry of await stored()) {
      if (adopted.some(({ id }) => id === entry.id)) {
        orders.set(entry.id, entry.order);
        await set(entry.id, { ...entry, tabId }, outbox());
      }
    }
  });
}
