import { getCollection, type CollectionEntry } from "astro:content";

export type Note = CollectionEntry<"notes">;

const FRESH_DAYS = 30;

export async function getNotes(): Promise<Note[]> {
  const notes = await getCollection("notes", ({ data }) => import.meta.env.DEV || !data.draft);
  return notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

const isFresh = (d?: Date) => !!d && Date.now() - d.getTime() < FRESH_DAYS * 864e5;

export function badge(note: Note): "new" | "updated" | null {
  if (isFresh(note.data.updated)) return "updated";
  if (isFresh(note.data.date)) return "new";
  return null;
}
