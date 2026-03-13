"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const metadataRows: Array<{
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

function getServerTone(
  _serverName: string,
  options: { active: boolean; compact: boolean; order: number },
) {
  if (options.active) {
    return "active";
  }

  const tones = ["secondary", "light", "accent"] as const;
  const tone = tones[options.order % tones.length];

  if (options.compact && tone === "light") {
    return "secondary";
  }

  return tone;
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

    const activeLeaf = document.querySelector<HTMLButtonElement>(
      '[data-table-leaf="true"][data-active="true"]',
    );
    activeLeaf?.scrollIntoView({
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

  function getVisibleTablesForServer(serverName: string) {
    return visibleTables.filter((table) => table.server === serverName);
  }

  function clearMetadataTimer() {
    if (metadataTimerRef.current) {
      clearTimeout(metadataTimerRef.current);
      metadataTimerRef.current = null;
    }
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

    return (
      <section
        className={cn(
          "server-card",
          options.active && "active",
          options.compact ? "compact" : "full",
          options.expanded && "expanded",
        )}
        key={server.name}
        style={{ ["--card-order" as string]: options.order }}
      >
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "server-block h-auto whitespace-normal rounded-none p-0",
            options.active && "active",
          )}
          data-tone={getServerTone(server.name, options)}
          data-server-block={server.name}
          disabled={disabled}
          onClick={() => handleServerSelection(server.name)}
        >
          <span className="server-block-plus" aria-hidden="true">
            {options.expanded ? "−" : "+"}
          </span>
          <span className="server-block-content">
            <span className="server-block-name">{server.name}</span>
            <span className="server-block-count">{count} tables</span>
          </span>
        </Button>
        {options.expanded ? (
          <div className="inline-hierarchy">
            {renderHierarchyForServer(server, options.showAll)}
          </div>
        ) : null}
      </section>
    );
  }

  function renderHierarchyForServer(
    server: FabricServer,
    forceOpenAll: boolean,
  ) {
    const visibleIds = new Set(
      getVisibleTablesForServer(server.name).map((table) => table.id),
    );

    if (visibleIds.size === 0) {
      return (
        <div className="branch-placeholder">
          No tables match the current search filter.
        </div>
      );
    }

    return (
      <>
        <div className="branch-stem" />
        <div className="warehouse-branch-list">
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
              <div
                className={cn("warehouse-branch", isOpen && "open")}
                key={warehouseKey}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="warehouse-toggle h-auto whitespace-normal rounded-none p-0"
                  onClick={() =>
                    !forceOpenAll && handleWarehouseToggle(warehouseKey)
                  }
                >
                  <span className="warehouse-caret" aria-hidden="true">
                    {isOpen ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </span>
                  <span className="warehouse-name">{warehouse.name}</span>
                  <Badge className="warehouse-count" variant="secondary">
                    {tables.length}
                  </Badge>
                </Button>
                <div className={cn("table-leaves", isOpen && "open")}>
                  {tables.map((table) => {
                    const isActive = selectedTableId === table.id;
                    return (
                      <Button
                        type="button"
                        variant="ghost"
                        key={table.id}
                        className={cn(
                          "table-leaf h-auto whitespace-normal rounded-none p-0",
                          isActive && "active",
                        )}
                        data-table-leaf="true"
                        data-active={isActive}
                        onClick={() => handleTableSelection(table)}
                      >
                        {table.tableName}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const activeServer = showAllServers
    ? null
    : (fabricCatalogData.servers.find(
        (server) => server.name === selectedServer,
      ) ?? null);
  const inactiveServers = fabricCatalogData.servers.filter(
    (server) => server.name !== activeServer?.name,
  );

  return (
    <>
      {isLandingVisible ? (
        <section
          className={cn(
            "fabric-landing",
            isLandingExiting && "is-exiting",
            !isLandingVisible && "is-hidden",
          )}
          aria-label="Super Group Landing"
        >
          <div className="landing-frame">
            <div className="landing-side left" aria-hidden="true" />
            <div className="landing-center">
              <Image
                src="/supergroup2.png"
                alt="Super Group"
                width={720}
                height={320}
                priority
                className="landing-brand-image"
              />
            </div>
            <div className="landing-side right" aria-hidden="true" />
            <Button
              type="button"
              id="enter-catalog-btn"
              className="enter-catalog-btn"
              onClick={handleEnterCatalog}
            >
              Data Availability
            </Button>
          </div>
        </section>
      ) : null}

      <div
        className={cn(
          "fabric-catalog-app",
          isLandingVisible && "landing-active",
        )}
      >
        <section className="catalog-shell availability-shell">
          <header className="catalog-header">
            <div className="header-title-block">
              <h1 className="catalog-title">Super Group Fabric Data Catalog</h1>
              <div className="summary-stats">
                <Badge className="stat-pill">
                  Servers: {fabricCatalogData.servers.length}
                </Badge>
                <Badge className="stat-pill">
                  Warehouses: {warehouseCount}
                </Badge>
                <Badge className="stat-pill">Tables: {allTables.length}</Badge>
              </div>
            </div>
            <div className="search-wrap">
              <Input
                type="search"
                className="global-search"
                placeholder="Search tables, warehouses, tags..."
                autoComplete="off"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </header>

          <main className="availability-stage">
            <section className="availability-orb-wrap">
              <div className="availability-orb">
                <div className="server-block-row">
                  <div
                    className={cn(
                      "branch-stage",
                      showAllServers
                        ? "show-all"
                        : activeServer
                          ? "has-active"
                          : "default-view",
                    )}
                  >
                    <aside className="branch-nav">
                      <Button
                        type="button"
                        className={cn(
                          "see-all-toggle",
                          showAllServers && "active",
                        )}
                        onClick={handleSeeAllToggle}
                      >
                        See all
                      </Button>
                    </aside>

                    <div className="branch-content">
                      {showAllServers ? (
                        <div className="server-grid all-open">
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
                        <div className="branch-focus-layout">
                          {renderServerCard(activeServer, {
                            active: true,
                            compact: false,
                            expanded: true,
                            showAll: false,
                            order: 0,
                          })}
                          <div className="server-stack">
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
                        <div className="server-grid">
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
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Card className="panel meta-panel metadata-dock">
              <div className="panel-head">
                <h2 className="panel-title">Metadata Details</h2>
                <div className="panel-head-actions">
                  <Badge className="count-badge" variant="secondary">
                    {metadataLoading
                      ? "Loading..."
                      : (selectedTable?.tableName ?? "No Selection")}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="panel-toggle"
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
                  "panel-body metadata-area",
                  metadataCollapsed && "panel-body-collapsed",
                )}
              >
                {metadataLoading ? (
                  <>
                    <div className="shimmer" />
                    <div className="shimmer" />
                    <div className="shimmer block" />
                    <div className="shimmer" />
                  </>
                ) : selectedTable ? (
                  <>
                    <Card className="meta-card">
                      <div className="meta-title-wrap">
                        <h3 className="meta-title">Table Overview</h3>
                        <span className={cn("status", selectedTable.slaStatus)}>
                          <span aria-hidden="true">●</span>
                          {getStatusLabel(selectedTable.slaStatus)}
                        </span>
                      </div>

                      <div className="meta-grid">
                        {metadataRows.slice(0, 8).map((row) => (
                          <div className="meta-row" key={row.label}>
                            <div className="meta-label">{row.label}</div>
                            <div className="meta-value">
                              {row.format
                                ? row.format(selectedTable[row.key])
                                : String(selectedTable[row.key])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="meta-card">
                      <h3 className="meta-title">Enterprise Metadata</h3>
                      <div className="meta-grid">
                        {metadataRows.slice(8).map((row) => (
                          <div className="meta-row" key={row.label}>
                            <div className="meta-label">{row.label}</div>
                            <div className="meta-value">
                              {row.format
                                ? row.format(selectedTable[row.key])
                                : String(selectedTable[row.key])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="meta-card table-snapshot">
                      <h3 className="meta-title">Selection Snapshot</h3>
                      <Table className="grid-table">
                        <TableHeader>
                          <TableRow className="table-row">
                            <TableHead>Table</TableHead>
                            <TableHead>Server</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Refresh</TableHead>
                            <TableHead>Rows</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="table-row selected">
                            <TableCell>{selectedTable.tableName}</TableCell>
                            <TableCell>{selectedTable.server}</TableCell>
                            <TableCell>{selectedTable.warehouse}</TableCell>
                            <TableCell>{selectedTable.LastRefresh}</TableCell>
                            <TableCell>{selectedTable.RowCount}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Card>
                  </>
                ) : (
                  <div className="empty-state">
                    Select a table from an expanded warehouse branch to view
                    metadata.
                  </div>
                )}
              </div>
            </Card>
          </main>
        </section>
      </div>
    </>
  );
}

export { FabricCatalog };
