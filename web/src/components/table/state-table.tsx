"use no memo";

import { useMemo } from "react";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { toBinaryLabel } from "@/lib/binary-label";
import type { TableApiResponse } from "@/lib/table-types";

interface StateTableProps {
  data: TableApiResponse;
  reversed: boolean;
}

export function StateTable({ data, reversed }: StateTableProps) {
  const labels = useMemo(
    () =>
      data.states.map((s) =>
        typeof s === "number" ? toBinaryLabel(s, data.max_height, reversed) : s,
      ),
    [data, reversed],
  );

  const groundLabel = useMemo(
    () =>
      typeof data.ground_state === "number"
        ? toBinaryLabel(data.ground_state, data.max_height, reversed)
        : data.ground_state,
    [data, reversed],
  );

  const columnHelper = createColumnHelper<(number | null)[]>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "source",
        header: "",
        cell: (info) => {
          const label = labels[info.row.index];
          const isGround = label === groundLabel;
          return (
            <span className={`font-mono font-medium ${isGround ? "text-primary" : ""}`}>
              {label}
            </span>
          );
        },
      }),
      ...labels.map((label, colIdx) =>
        columnHelper.accessor((row) => row[colIdx], {
          id: `col-${colIdx}`,
          header: () => {
            const isGround = label === groundLabel;
            return <span className={`font-mono ${isGround ? "text-primary" : ""}`}>{label}</span>;
          },
          cell: (info) => {
            const value = info.getValue();
            return <span className="font-mono">{value != null ? value : "-"}</span>;
          },
        }),
      ),
    ],
    [labels, groundLabel, columnHelper],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- opted out via "use no memo"
  const table = useReactTable({
    data: data.cells,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={`border-border border px-2 py-1.5 text-center whitespace-nowrap ${
                    header.column.id === "source"
                      ? "bg-muted sticky top-0 left-0 z-30"
                      : "bg-muted sticky top-0 z-20"
                  }`}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) =>
                cell.column.id === "source" ? (
                  <th
                    key={cell.id}
                    scope="row"
                    className="border-border bg-background sticky left-0 z-10 border px-2 py-1 text-center whitespace-nowrap"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </th>
                ) : (
                  <td
                    key={cell.id}
                    className="border-border border px-2 py-1 text-center whitespace-nowrap"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
