"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type FabricServer,
  type FabricTable,
  fabricCatalogData,
} from "@/lib/fabric-catalog-data";
import { cn } from "@/lib/utils";

const allTables = fabricCatalogData.servers.flatMap((server) =>
  server.warehouses.flatMap((warehouse) => warehouse.tables),
);

const overviewRows: Array<{
  label: string;
  key: keyof FabricTable;
  format?: (value: FabricTable[keyof FabricTable]) => string;
}> = [
  { label: "Server", key: "server" },
  { label: "Warehouse", key: "warehouse" },
  { label: "SLADelayThreshold", key: "SLADelayThreshold" },
  { label: "DataObjectUTCAdjustment", key: "DataObjectUTCAdjustment" },
  {
    label: "IsDQA",
    key: "IsDQA",
    format: (value) => ((value as boolean) ? "Yes" : "No"),
  },
  { label: "FirstDataDate", key: "FirstDataDate" },
  { label: "AvailabilityDate", key: "AvailabilityDate" },
  {
    label: "DataTags",
    key: "DataTags",
    format: (value) => (value as string[]).join(", "),
  },
];

const enterpriseRows: Array<{
  label: string;
  key: keyof FabricTable;
}> = [
  { label: "Last Refresh", key: "LastRefresh" },
  { label: "Row Count", key: "RowCount" },
  { label: "Data Owner", key: "DataOwner" },
  { label: "Source System", key: "SourceSystem" },
  { label: "Storage Size", key: "StorageSize" },
  { label: "Comment", key: "Comment" },
];

function getStatusLabel(status: FabricTable["slaStatus"]) {
  if (status === "near") return "Near SLA";
  if (status === "breached") return "Breached";
  return "Within SLA";
}

function getStatusClasses(status: FabricTable["slaStatus"]) {
  if (status === "near") {
    return "border-[#F5A94A]/40 bg-[#F5A94A]/14 text-[#F5A94A]";
  }

  if (status === "breached") {
    return "border-[#7C3AED]/35 bg-[#7C3AED]/14 text-[#7C3AED]";
  }

  return "border-[#009F4D]/35 bg-[#009F4D]/12 text-[#009F4D]";
}

function metadataValue(
  table: FabricTable,
  row: {
    key: keyof FabricTable;
    format?: (value: FabricTable[keyof FabricTable]) => string;
  },
) {
  return row.format ? row.format(table[row.key]) : String(table[row.key]);
}

function FabricCatalog() {
  const [isLandingVisible, setIsLandingVisible] = useState(true);
  const [isLandingExiting, setIsLandingExiting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [showAllServers, setShowAllServers] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(
    () => new Set(),
  );
  const [metadataCollapsed, setMetadataCollapsed] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const metadataTimerRef = useRef<number | null>(null);
  const tableRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const query = deferredSearchTerm.trim().toLowerCase();
  const visibleTables = allTables.filter((table) => {
    if (!query) {
      return true;
    }

    return (
      table.tableName.toLowerCase().includes(query) ||
      table.warehouse.toLowerCase().includes(query) ||
      table.server.toLowerCase().includes(query) ||
      table.DataTags.join(" ").toLowerCase().includes(query)
    );
  });

  const countsByServer = Object.fromEntries(
    fabricCatalogData.servers.map((server) => [
      server.name,
      visibleTables.filter((table) => table.server === server.name).length,
    ]),
  );

  const selectedTable =
    allTables.find((table) => table.id === selectedTableId) ?? null;

  useEffect(() => {
    if (
      selectedServer &&
      !visibleTables.some((table) => table.server === selectedServer)
    ) {
      setSelectedServer(null);
      setSelectedTableId(null);
      setExpandedWarehouses(new Set());
    }
  }, [selectedServer, visibleTables]);

  useEffect(() => {
    if (!selectedTableId || metadataLoading) {
      return;
    }

    tableRefs.current[selectedTableId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [metadataLoading, selectedTableId]);

  useEffect(() => {
    return () => {
      if (metadataTimerRef.current) {
        clearTimeout(metadataTimerRef.current);
      }
    };
  }, []);

  const warehouseCount = fabricCatalogData.servers.reduce(
    (sum, server) => sum + server.warehouses.length,
    0,
  );

  const activeServer = showAllServers
    ? null
    : (fabricCatalogData.servers.find(
        (server) => server.name === selectedServer,
      ) ?? null);

  const inactiveServers = fabricCatalogData.servers.filter(
    (server) => server.name !== activeServer?.name,
  );

  function clearMetadataTimer() {
    if (metadataTimerRef.current) {
      clearTimeout(metadataTimerRef.current);
      metadataTimerRef.current = null;
    }
  }

  function getVisibleTablesForServer(serverName: string) {
    return visibleTables.filter((table) => table.server === serverName);
  }

  function handleEnterCatalog() {
    setIsLandingExiting(true);
    window.setTimeout(() => {
      setIsLandingVisible(false);
      setIsLandingExiting(false);
    }, 420);
  }

  function handleSeeAllToggle() {
    setShowAllServers((current) => !current);
    setSelectedServer(null);
    setSelectedTableId(null);
    setExpandedWarehouses(new Set());
    clearMetadataTimer();
    setMetadataLoading(false);
  }

  function handleServerSelection(serverName: string) {
    setShowAllServers(false);
    clearMetadataTimer();
    setMetadataLoading(false);
    setSelectedTableId(null);
    setExpandedWarehouses(new Set());
    setSelectedServer((current) =>
      current === serverName ? null : serverName,
    );
  }

  function handleWarehouseToggle(warehouseKey: string) {
    setExpandedWarehouses((current) => {
      const next = new Set(current);
      if (next.has(warehouseKey)) {
        next.delete(warehouseKey);
      } else {
        next.add(warehouseKey);
      }
      return next;
    });
  }

  function handleTableSelection(table: FabricTable) {
    if (selectedTableId === table.id) {
      clearMetadataTimer();
      setSelectedTableId(null);
      setMetadataLoading(false);
      return;
    }

    clearMetadataTimer();
    setShowAllServers(false);
    setSelectedServer(table.server);
    setExpandedWarehouses(new Set([`${table.server}__${table.warehouse}`]));
    setSelectedTableId(table.id);
    setMetadataLoading(true);
    metadataTimerRef.current = window.setTimeout(() => {
      setMetadataLoading(false);
      metadataTimerRef.current = null;
    }, 340);
  }

  function renderHierarchy(server: FabricServer, forceOpenAll: boolean) {
    const visibleIds = new Set(
      getVisibleTablesForServer(server.name).map((table) => table.id),
    );

    if (visibleIds.size === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          No tables match the current search filter.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {server.warehouses.map((warehouse) => {
          const tables = warehouse.tables.filter((table) =>
            visibleIds.has(table.id),
          );

          if (tables.length === 0) {
            return null;
          }

          const warehouseKey = `${server.name}__${warehouse.name}`;
          const isOpen = forceOpenAll || expandedWarehouses.has(warehouseKey);

          return (
            <Card
              key={warehouseKey}
              className="overflow-hidden rounded-2xl border border-[#1F2A44]/10 bg-white shadow-none"
            >
              <Button
                type="button"
                variant="ghost"
                className="flex h-auto w-full items-center justify-between rounded-none px-4 py-4 text-left text-[#1F2A44] hover:bg-[#EEF2FB]"
                onClick={() =>
                  !forceOpenAll && handleWarehouseToggle(warehouseKey)
                }
              >
                <span className="flex min-w-0 items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="size-4 shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0" />
                  )}
                  <span className="truncate text-sm font-semibold">
                    {warehouse.name}
                  </span>
                </span>
                <Badge
                  variant="secondary"
                  className="rounded-full bg-[#7C3AED]/12 px-3 py-1 text-[#1F2A44]"
                >
                  {tables.length}
                </Badge>
              </Button>

              <div
                className={cn(
                  "grid overflow-hidden border-t border-[#1F2A44]/10 transition-all duration-300",
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 bg-[#EEF2FB]/70">
                  <div className="space-y-px">
                    {tables.map((table) => {
                      const isActive = selectedTableId === table.id;

                      return (
                        <Button
                          key={table.id}
                          type="button"
                          variant="ghost"
                          ref={(element) => {
                            tableRefs.current[table.id] = element;
                          }}
                          className={cn(
                            "h-auto w-full justify-start rounded-none px-4 py-3 text-left text-sm text-[#1F2A44] hover:bg-[#7C3AED]/10",
                            isActive &&
                              "bg-[#F5A94A]/25 font-semibold text-[#1F2A44]",
                          )}
                          onClick={() => handleTableSelection(table)}
                        >
                          {table.tableName}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  function renderServerCard(
    server: FabricServer,
    options: {
      active: boolean;
      compact: boolean;
      expanded: boolean;
      showAll: boolean;
      order: number;
    },
  ) {
    const count = countsByServer[server.name] ?? 0;
    const disabled = count === 0;
    const isSelected = options.active;

    return (
      <div
        key={server.name}
        className={cn(
          "space-y-4 transition-all duration-300",
          options.compact ? "origin-top-right scale-[0.94]" : "scale-100",
        )}
        style={{ animationDelay: `${options.order * 70}ms` }}
      >
        <Card
          className={cn(
            "overflow-hidden rounded-none border border-[#1F2A44]/10 bg-white shadow-[0_18px_40px_rgba(8,12,24,0.16)] transition-all duration-300",
            isSelected && "border-[#7C3AED] bg-[#7C3AED] text-white",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => handleServerSelection(server.name)}
            className={cn(
              "h-auto w-full rounded-none p-0 text-left hover:bg-transparent",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <div
              className={cn(
                "flex min-h-[320px] flex-col justify-between p-8",
                options.compact && "min-h-[220px] p-6",
                isSelected && "min-h-[360px]",
              )}
            >
              <div className="flex justify-end">
                <span
                  className={cn(
                    "grid size-16 place-items-center rounded-full bg-[#009F4D] text-[2.2rem] leading-none text-white",
                    isSelected && "bg-white text-[#7C3AED]",
                  )}
                >
                  {options.expanded ? "−" : "+"}
                </span>
              </div>

              <div className="max-w-[13rem] space-y-3">
                <h3
                  className={cn(
                    "text-balance text-[clamp(2rem,2.7vw,3.25rem)] leading-none font-light tracking-tight text-[#1F2A44]",
                    options.compact && "text-[2.15rem]",
                    isSelected && "text-white",
                  )}
                >
                  {server.name}
                </h3>
                <p
                  className={cn(
                    "text-lg font-medium text-[#1F2A44]/65",
                    options.compact && "text-base",
                    isSelected && "text-white/80",
                  )}
                >
                  {count} tables
                </p>
              </div>
            </div>
          </Button>
        </Card>

        {options.expanded ? (
          <div className="max-h-[360px] overflow-auto rounded-[1.6rem] bg-[#1F2A44]/95 p-4 shadow-[0_22px_44px_rgba(17,28,49,0.2)]">
            {renderHierarchy(server, options.showAll)}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {isLandingVisible ? (
        <section
          aria-label="Super Group Landing"
          className={cn(
            "fixed inset-0 z-50 grid place-items-center bg-[radial-gradient(circle_at_50%_50%,rgba(0,159,77,0.55)_0%,rgba(0,159,77,0.12)_34%,transparent_62%),radial-gradient(circle_at_15%_15%,rgba(31,42,68,0.78)_0%,rgba(40,50,75,0.9)_50%,#1F2A44_100%)] p-5 transition-opacity duration-500",
            isLandingExiting && "opacity-0",
          )}
        >
          <div className="relative grid min-h-[min(740px,92vh)] w-full max-w-6xl place-items-center overflow-hidden border-2 border-[#7C3AED] bg-[linear-gradient(145deg,rgba(31,42,68,0.82)_0%,rgba(40,50,75,0.7)_100%)] p-8 shadow-[0_26px_58px_rgba(0,0,0,0.55)]">
            <div className="pointer-events-none absolute inset-[-10%] bg-[radial-gradient(circle_at_50%_50%,rgba(0,159,77,0.4)_0%,rgba(0,159,77,0.08)_42%,transparent_72%),linear-gradient(130deg,rgba(124,58,237,0.14)_0%,transparent_40%)]" />
            <Image
              src="/supergroup2.png"
              alt="Super Group"
              width={720}
              height={320}
              priority
              className="relative z-10 h-auto w-full max-w-[540px] object-contain"
            />
            <Button
              type="button"
              onClick={handleEnterCatalog}
              className="absolute bottom-6 left-1/2 z-10 h-auto -translate-x-1/2 rounded-full border border-[#009F4D] bg-[#009F4D] px-7 py-3 text-sm uppercase tracking-[0.16em] text-white shadow-[0_10px_20px_rgba(0,159,77,0.32)] hover:bg-[#009F4D]/90"
            >
              Data Availability
            </Button>
          </div>
        </section>
      ) : null}

      <div className="min-h-screen bg-[radial-gradient(circle_at_12%_14%,rgba(124,58,237,0.16)_0%,transparent_30%),radial-gradient(circle_at_85%_20%,rgba(245,169,74,0.14)_0%,transparent_26%),linear-gradient(180deg,#1F2A44_0%,#28324B_100%)] px-6 py-6 text-white">
        <section className="mx-auto max-w-[1600px] overflow-hidden border border-white/10 bg-transparent shadow-[0_14px_30px_rgba(8,14,26,0.22)]">
          <header className="flex flex-col gap-4 bg-[linear-gradient(130deg,#1F2A44_0%,#1F2A44_60%,#28324B_100%)] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Super Group Fabric Data Catalog
              </h1>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full border border-[#009F4D]/40 bg-[#009F4D]/15 px-3 py-1 text-sm text-[#D8FFEB]">
                  Servers: {fabricCatalogData.servers.length}
                </Badge>
                <Badge className="rounded-full border border-[#009F4D]/40 bg-[#009F4D]/15 px-3 py-1 text-sm text-[#D8FFEB]">
                  Warehouses: {warehouseCount}
                </Badge>
                <Badge className="rounded-full border border-[#009F4D]/40 bg-[#009F4D]/15 px-3 py-1 text-sm text-[#D8FFEB]">
                  Tables: {allTables.length}
                </Badge>
              </div>
            </div>

            <div className="w-full max-w-[540px]">
              <Input
                type="search"
                placeholder="Search tables, warehouses, tags..."
                autoComplete="off"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-auto rounded-xl border-white/20 bg-[#1F2A44]/70 px-4 py-3 text-base text-white placeholder:text-white/65 focus-visible:border-[#009F4D] focus-visible:ring-[#7C3AED]/30"
              />
            </div>
          </header>

          <main className="grid gap-7 border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%),linear-gradient(180deg,#1F2A44_0%,#28324B_100%)] p-6 lg:grid-cols-[170px_minmax(0,1fr)]">
            <aside className="lg:pt-10">
              <Button
                type="button"
                onClick={handleSeeAllToggle}
                className={cn(
                  "h-auto w-full rounded-full bg-[#1F2A44] px-6 py-4 text-xl font-semibold text-white shadow-[0_16px_32px_rgba(31,42,68,0.18)] hover:bg-[#1F2A44]/90",
                  showAllServers &&
                    "bg-[#F5A94A] text-[#1F2A44] shadow-[0_20px_36px_rgba(245,169,74,0.24)]",
                )}
              >
                See all
              </Button>
            </aside>

            <section className="space-y-7">
              {showAllServers ? (
                <div className="grid gap-7 xl:grid-cols-3">
                  {fabricCatalogData.servers.map((server, index) =>
                    renderServerCard(server, {
                      active: false,
                      compact: false,
                      expanded: true,
                      showAll: true,
                      order: index,
                    }),
                  )}
                </div>
              ) : activeServer ? (
                <div className="grid gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.72fr)]">
                  {renderServerCard(activeServer, {
                    active: true,
                    compact: false,
                    expanded: true,
                    showAll: false,
                    order: 0,
                  })}

                  <div className="grid content-start gap-6">
                    {inactiveServers.map((server, index) =>
                      renderServerCard(server, {
                        active: false,
                        compact: true,
                        expanded: false,
                        showAll: false,
                        order: index + 1,
                      }),
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-7 xl:grid-cols-3">
                  {fabricCatalogData.servers.map((server, index) =>
                    renderServerCard(server, {
                      active: false,
                      compact: false,
                      expanded: false,
                      showAll: false,
                      order: index,
                    }),
                  )}
                </div>
              )}
            </section>

            <Card className="overflow-hidden rounded-[28px] border border-[#1F2A44]/15 bg-[linear-gradient(180deg,#FFFFFF_0%,#EEF2FB_100%)] shadow-[0_14px_24px_rgba(5,10,20,0.18)] lg:col-start-2">
              <div className="flex items-center justify-between gap-3 border-b border-[#1F2A44]/12 bg-[linear-gradient(180deg,#FFFFFF_0%,#EEF2FB_100%)] px-5 py-4">
                <h2 className="text-lg font-semibold text-[#1F2A44]">
                  Metadata Details
                </h2>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-[#7C3AED]/14 px-3 py-1 text-[#7C3AED]"
                  >
                    {metadataLoading
                      ? "Loading..."
                      : (selectedTable?.tableName ?? "No Selection")}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-xl border border-[#1F2A44]/18 bg-white text-[#1F2A44] hover:bg-[#7C3AED]/12 hover:text-[#1F2A44]"
                    aria-expanded={!metadataCollapsed}
                    title={
                      metadataCollapsed
                        ? "Expand metadata panel"
                        : "Collapse metadata panel"
                    }
                    onClick={() => setMetadataCollapsed((current) => !current)}
                  >
                    {metadataCollapsed ? "▸" : "▾"}
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  metadataCollapsed
                    ? "max-h-0 opacity-0"
                    : "max-h-[1400px] opacity-100",
                )}
              >
                <CardContent className="grid gap-4 p-4">
                  {metadataLoading ? (
                    <>
                      <Skeleton className="h-5 w-1/3 bg-[#28324B]/12" />
                      <Skeleton className="h-5 w-2/5 bg-[#28324B]/12" />
                      <Skeleton className="h-28 w-full bg-[#28324B]/12" />
                      <Skeleton className="h-5 w-1/2 bg-[#28324B]/12" />
                    </>
                  ) : selectedTable ? (
                    <>
                      <Card className="rounded-2xl border border-[#1F2A44]/10 bg-[linear-gradient(180deg,#FFFFFF_0%,#EEF2FB_100%)] shadow-none">
                        <CardContent className="space-y-4 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-[#1F2A44]">
                              Table Overview
                            </h3>
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                                getStatusClasses(selectedTable.slaStatus),
                              )}
                            >
                              <span aria-hidden="true">●</span>
                              {getStatusLabel(selectedTable.slaStatus)}
                            </span>
                          </div>

                          <div className="grid gap-3">
                            {overviewRows.map((row) => (
                              <div
                                key={row.label}
                                className="grid gap-1 border-b border-[#1F2A44]/10 pb-3 text-sm last:border-b-0 last:pb-0 sm:grid-cols-[150px_1fr] sm:gap-4"
                              >
                                <div className="font-semibold text-[#1F2A44]/60">
                                  {row.label}
                                </div>
                                <div className="text-[#1F2A44]">
                                  {metadataValue(selectedTable, row)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border border-[#1F2A44]/10 bg-[linear-gradient(180deg,#FFFFFF_0%,#EEF2FB_100%)] shadow-none">
                        <CardContent className="space-y-4 p-4">
                          <h3 className="text-sm font-semibold text-[#1F2A44]">
                            Enterprise Metadata
                          </h3>

                          <div className="grid gap-3">
                            {enterpriseRows.map((row) => (
                              <div
                                key={row.label}
                                className="grid gap-1 border-b border-[#1F2A44]/10 pb-3 text-sm last:border-b-0 last:pb-0 sm:grid-cols-[150px_1fr] sm:gap-4"
                              >
                                <div className="font-semibold text-[#1F2A44]/60">
                                  {row.label}
                                </div>
                                <div className="text-[#1F2A44]">
                                  {String(selectedTable[row.key])}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border border-[#1F2A44]/10 bg-[linear-gradient(180deg,#FFFFFF_0%,#EEF2FB_100%)] shadow-none">
                        <CardContent className="space-y-4 p-4">
                          <h3 className="text-sm font-semibold text-[#1F2A44]">
                            Selection Snapshot
                          </h3>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-[#1F2A44]/12 bg-[#1F2A44] hover:bg-[#1F2A44]">
                                <TableHead className="text-white">
                                  Table
                                </TableHead>
                                <TableHead className="text-white">
                                  Server
                                </TableHead>
                                <TableHead className="text-white">
                                  Warehouse
                                </TableHead>
                                <TableHead className="text-white">
                                  Refresh
                                </TableHead>
                                <TableHead className="text-white">
                                  Rows
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="border-[#1F2A44]/12 bg-[#F5A94A]/16 hover:bg-[#F5A94A]/22">
                                <TableCell className="text-[#1F2A44]">
                                  {selectedTable.tableName}
                                </TableCell>
                                <TableCell className="text-[#1F2A44]">
                                  {selectedTable.server}
                                </TableCell>
                                <TableCell className="text-[#1F2A44]">
                                  {selectedTable.warehouse}
                                </TableCell>
                                <TableCell className="text-[#1F2A44]">
                                  {selectedTable.LastRefresh}
                                </TableCell>
                                <TableCell className="text-[#1F2A44]">
                                  {selectedTable.RowCount}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-[#1F2A44]/10 bg-white/70 p-5 text-base text-[#1F2A44]/70">
                      Select a table from an expanded warehouse branch to view
                      metadata.
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          </main>
        </section>
      </div>
    </>
  );
}

export { FabricCatalog };
