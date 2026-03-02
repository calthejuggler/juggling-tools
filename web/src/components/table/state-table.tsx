import { useCallback, useMemo } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";

import { toAbbreviatedLabel, toBinaryLabel } from "@/lib/binary-label";
import type { TableApiResponse } from "@/lib/table-types";

interface StateTableProps {
  data: TableApiResponse;
  reversed: boolean;
  abbreviated: boolean;
  scrollElement: HTMLDivElement | null;
}

const ROW_HEIGHT = 33;
const MIN_COL_WIDTH = 65;
const CHAR_WIDTH = 8.4;
const CELL_PADDING = 18; // px-2 (16px) + border (2px)

export function StateTable({ data, reversed, abbreviated, scrollElement }: StateTableProps) {
  "use no memo";

  const labels = useMemo(
    () =>
      data.states.map((s) =>
        typeof s === "number"
          ? abbreviated
            ? toAbbreviatedLabel(s, data.max_height)
            : toBinaryLabel(s, data.max_height, reversed)
          : s,
      ),
    [data, reversed, abbreviated],
  );

  const groundLabel = useMemo(
    () =>
      typeof data.ground_state === "number"
        ? abbreviated
          ? toAbbreviatedLabel(data.ground_state, data.max_height)
          : toBinaryLabel(data.ground_state, data.max_height, reversed)
        : data.ground_state,
    [data, reversed, abbreviated],
  );

  const rowCount = data.cells.length;
  const colCount = labels.length;

  const colWidth = useMemo(() => {
    const maxLen = labels.reduce((max, l) => Math.max(max, String(l).length), 0);
    return Math.max(MIN_COL_WIDTH, Math.ceil(maxLen * CHAR_WIDTH + CELL_PADDING));
  }, [labels]);

  const stickyColWidth = colWidth;

  // eslint-disable-next-line react-hooks/incompatible-library -- opted out via "use no memo"
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: colCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => colWidth,
    overscan: 10,
  });

  const renderCell = useCallback(
    (rowIdx: number, colIdx: number) => {
      const value = data.cells[rowIdx]?.[colIdx];
      return <span className="font-mono">{value != null ? value : "-"}</span>;
    },
    [data.cells],
  );

  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize() + ROW_HEIGHT}px`,
        width: `${colVirtualizer.getTotalSize() + stickyColWidth}px`,
        position: "relative",
      }}
    >
      {/* Sticky header row */}
      <div
        className="bg-muted sticky top-0 z-20"
        style={{
          height: ROW_HEIGHT,
          width: `${colVirtualizer.getTotalSize() + stickyColWidth}px`,
        }}
      >
        {/* Top-left corner cell */}
        <div
          className="border-border bg-muted sticky left-0 z-30 inline-flex items-center justify-center border"
          style={{
            width: stickyColWidth,
            height: ROW_HEIGHT,
          }}
        />
        {/* Header cells */}
        {colVirtualizer.getVirtualItems().map((virtualCol) => {
          const label = labels[virtualCol.index];
          const isGround = label === groundLabel;
          return (
            <div
              key={virtualCol.key}
              className="border-border bg-muted inline-flex items-center justify-center border px-2 text-center text-sm font-semibold whitespace-nowrap"
              style={{
                position: "absolute",
                top: 0,
                left: virtualCol.start + stickyColWidth,
                width: virtualCol.size,
                height: ROW_HEIGHT,
              }}
            >
              <span className={`font-mono ${isGround ? "text-primary" : ""}`}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Rows */}
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const rowLabel = labels[virtualRow.index];
        const isGroundRow = rowLabel === groundLabel;
        return (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: virtualRow.start + ROW_HEIGHT,
              left: 0,
              width: `${colVirtualizer.getTotalSize() + stickyColWidth}px`,
              height: virtualRow.size,
            }}
          >
            {/* Sticky row header */}
            <div
              className="border-border bg-background sticky left-0 z-10 inline-flex items-center justify-center border px-2 text-center text-sm font-semibold whitespace-nowrap"
              style={{
                width: stickyColWidth,
                height: virtualRow.size,
              }}
            >
              <span className={`font-mono ${isGroundRow ? "text-primary" : ""}`}>{rowLabel}</span>
            </div>
            {/* Data cells */}
            {colVirtualizer.getVirtualItems().map((virtualCol) => (
              <div
                key={virtualCol.key}
                className="border-border inline-flex items-center justify-center border px-2 text-center text-sm whitespace-nowrap"
                style={{
                  position: "absolute",
                  top: 0,
                  left: virtualCol.start + stickyColWidth,
                  width: virtualCol.size,
                  height: virtualRow.size,
                }}
              >
                {renderCell(virtualRow.index, virtualCol.index)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
