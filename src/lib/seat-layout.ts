import type { SeatLayout } from "./api";

/** One row of a seat grid — a seat's label, or null for an aisle/gap. Rows
 * can be different lengths, unlike the older shared-column-template format
 * (e.g. a bus's back row is often wider than the rest). */
export type SeatGrid = (string | null)[][];

/**
 * Expand a stored layout into a uniform 2D grid for rendering. Prefers the
 * newer freeform `grid` field (admin-edited layouts); falls back to the
 * legacy `rows` × shared `cols` template (+ optional flat `labels` override)
 * for buses registered before the seat-map editor existed, then to a plain
 * 2+2 default if there's no layout at all. Every existing consumer keeps
 * rendering exactly as it did before this field was introduced.
 */
export function layoutToGrid(layout: SeatLayout | null, seatCount: number): SeatGrid {
  if (layout?.grid && layout.grid.length > 0) return layout.grid;

  const rows = layout?.rows ?? Math.ceil(seatCount / 4);
  const cols = layout?.cols ?? ["A", "B", null, "C", "D"];
  const labels = layout?.labels;

  const grid: SeatGrid = [];
  let i = 0;
  for (let r = 1; r <= rows; r++) {
    const row: (string | null)[] = [];
    for (const col of cols) {
      if (col === null) {
        row.push(null);
        continue;
      }
      if (i >= seatCount) {
        row.push(null);
        continue;
      }
      row.push(labels?.[i] ?? `${r}${col}`);
      i++;
    }
    grid.push(row);
  }
  return grid;
}

/** Package a freeform grid back into the storage shape (rows/cols kept
 * minimal/vestigial — the grid field is what every consumer actually reads). */
export function gridToLayout(grid: SeatGrid): SeatLayout {
  return { rows: grid.length, cols: [], grid };
}

export function countSeats(grid: SeatGrid): number {
  return grid.reduce((sum, row) => sum + row.filter((c) => c !== null).length, 0);
}

const TEMPLATE_COLS: Record<string, (string | null)[]> = {
  "2x2": ["A", "B", null, "C", "D"],
  "3x2": ["A", "B", "C", null, "D", "E"],
  "2x1": ["A", "B", null, "C"],
};

/** Build a fresh grid from one of the site's existing 2x2/3x2/2x1 seating
 * styles at a given seat count — the "draft template" starting points the
 * admin editor offers before hand-customizing. */
export function buildTemplateGrid(style: keyof typeof TEMPLATE_COLS, seatCount: number): SeatGrid {
  const cols = TEMPLATE_COLS[style];
  const seatsPerRow = cols.filter((c) => c !== null).length;
  const rows = Math.ceil(seatCount / seatsPerRow);
  const grid: SeatGrid = [];
  let i = 0;
  for (let r = 1; r <= rows; r++) {
    const row: (string | null)[] = [];
    for (const col of cols) {
      if (col === null) {
        row.push(null);
        continue;
      }
      if (i >= seatCount) {
        row.push(null);
        continue;
      }
      row.push(`${r}${col}`);
      i++;
    }
    grid.push(row);
  }
  return grid;
}

export interface SeatTemplate {
  id: string;
  label: string;
  style: keyof typeof TEMPLATE_COLS;
  seatCount: number;
}

export const SEAT_TEMPLATES: SeatTemplate[] = [
  { id: "2x2-40", label: "2 × 2 · 40 seats", style: "2x2", seatCount: 40 },
  { id: "2x2-45", label: "2 × 2 · 45 seats", style: "2x2", seatCount: 45 },
  { id: "3x2-49", label: "3 × 2 · 49 seats", style: "3x2", seatCount: 49 },
  { id: "3x2-54", label: "3 × 2 · 54 seats", style: "3x2", seatCount: 54 },
  { id: "2x1-30", label: "2 × 1 · 30 seats", style: "2x1", seatCount: 30 },
  { id: "2x1-24", label: "2 × 1 · 24 seats (sleeper)", style: "2x1", seatCount: 24 },
];
