"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PrimeScanRow, PrimeScanSummary, PrimeState } from "@/domain/prime";

type SortField =
  | "rank"
  | "ltp"
  | "dayChangePercent"
  | "volumeRatio"
  | "distanceToYh"
  | "distanceToYl"
  | "emaDistancePercent"
  | "state"
  | "score";

type SortDirection = "asc" | "desc";

const STATE_COLORS: Record<PrimeState, string> = {
  WATCH: "bg-blue-500/15 text-blue-300 border border-blue-400/30",
  SETUP: "bg-amber-500/15 text-amber-200 border border-amber-300/30",
  CONFIRMED: "bg-emerald-500/15 text-emerald-200 border border-emerald-300/30",
  FAKE_BREAKOUT: "bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-300/30",
  INVALID: "bg-red-500/15 text-red-200 border border-red-300/30",
  NO_TRADE: "bg-zinc-500/20 text-zinc-300 border border-zinc-400/30",
};

const STATE_PRIORITY: Record<PrimeState, number> = {
  CONFIRMED: 1,
  SETUP: 2,
  FAKE_BREAKOUT: 3,
  WATCH: 4,
  NO_TRADE: 5,
  INVALID: 6,
};

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function PrimeDashboard() {
  const [summary, setSummary] = useState<PrimeScanSummary | null>(null);
  const [status, setStatus] = useState<{
    upstoxConnected: boolean;
    sessionExpired: boolean;
    tokenExpiry: string | null;
    marketStatus: "PRE_MARKET" | "OPEN" | "CLOSED";
    istTime: string;
    marketHours: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [directionFilter, setDirectionFilter] = useState<string>("ALL");
  const [volumeFilter, setVolumeFilter] = useState<string>("ALL");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [onlySetups, setOnlySetups] = useState(false);
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedStock, setSelectedStock] = useState<PrimeScanRow | null>(null);
  const [istTime, setIstTime] = useState<string>("--:--:--");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statusResponse, scanResponse] = await Promise.all([
        fetch("/api/upstox/status", { cache: "no-store" }),
        fetch("/api/upstox/prime-scan-all", { cache: "no-store" }),
      ]);

      const statusJson = (await statusResponse.json()) as {
        upstoxConnected: boolean;
        sessionExpired: boolean;
        tokenExpiry: string | null;
        marketStatus: "PRE_MARKET" | "OPEN" | "CLOSED";
        istTime: string;
        marketHours: string;
      };
      setStatus(statusJson);
      setIstTime(statusJson.istTime);

      if (!scanResponse.ok) {
        setSummary(null);
        setError("MARKET DATA UNAVAILABLE");
        return;
      }

      const scanJson = (await scanResponse.json()) as PrimeScanSummary;
      setSummary(scanJson);

      setSelectedStock((prev) => {
        if (!prev) return scanJson.rows[0] ?? null;
        return scanJson.rows.find((r) => r.instrumentKey === prev.instrumentKey) ?? scanJson.rows[0] ?? null;
      });
    } catch {
      setError("MARKET DATA UNAVAILABLE");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const timer = setInterval(() => {
      const nowText = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
      setIstTime(nowText);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const rows = summary?.rows ?? [];

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = query.trim().toLowerCase();
      if (q && !row.stock.toLowerCase().includes(q)) return false;
      if (stateFilter !== "ALL" && row.state !== stateFilter) return false;
      if (directionFilter !== "ALL" && row.direction !== directionFilter) return false;
      if (volumeFilter !== "ALL" && (row.volumeClass ?? "NORMAL") !== volumeFilter) return false;
      if (levelFilter !== "ALL") {
        const touched = row.reaction.touchedLevel;
        if (levelFilter === "YH" && touched !== "YH") return false;
        if (levelFilter === "YL" && touched !== "YL") return false;
        if (levelFilter === "NONE" && touched !== "NONE") return false;
      }
      if (onlySetups && row.state !== "SETUP") return false;
      if (onlyConfirmed && row.state !== "CONFIRMED") return false;
      return true;
    });
  }, [rows, query, stateFilter, directionFilter, volumeFilter, levelFilter, onlySetups, onlyConfirmed]);

  const sortedRows = useMemo(() => {
    const next = [...filteredRows];

    next.sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;

      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);

      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return a.stock.localeCompare(b.stock);
    });

    return next;
  }, [filteredRows, sortField, sortDirection]);

  const summaryCards = useMemo(() => {
    const counts = {
      buy: rows.filter((r) => r.direction === "BUY").length,
      sell: rows.filter((r) => r.direction === "SELL").length,
      setup: rows.filter((r) => r.state === "SETUP").length,
      confirmed: rows.filter((r) => r.state === "CONFIRMED").length,
      watch: rows.filter((r) => r.state === "WATCH").length,
      fakeBreakout: rows.filter((r) => r.state === "FAKE_BREAKOUT").length,
      noTrade: rows.filter((r) => r.state === "NO_TRADE" || r.state === "INVALID").length,
      discovery: rows.filter((r) => r.discoveryEligible).length,
    };

    return [
      { label: "F&O UNIVERSE", value: summary?.universeCount ?? 0 },
      { label: "PRIME BUY", value: counts.buy },
      { label: "PRIME SELL", value: counts.sell },
      { label: "SETUPS", value: counts.setup },
      { label: "CONFIRMED", value: counts.confirmed },
      { label: "WATCH", value: counts.watch },
      { label: "FAKE BREAKOUT", value: counts.fakeBreakout },
      { label: "NO TRADE", value: counts.noTrade },
      { label: "09:15 DISCOVERY", value: counts.discovery },
    ];
  }, [rows, summary?.universeCount]);

  return (
    <main className="min-h-screen bg-[#070b14] text-zinc-100">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 lg:p-6">
        <header className="rounded-xl border border-zinc-800 bg-[#0d1322] p-4 lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-wide text-zinc-100 lg:text-2xl">PRIME TECHNICAL MASTER</h1>
              <p className="text-xs text-zinc-400 lg:text-sm">NSE F&O • Prime Technical Scanner • Upstox Market Data</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!status?.upstoxConnected ? (
                <a
                  href="/api/upstox/login"
                  className="rounded-md border border-amber-400/30 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100"
                >
                  CONNECT UPSTOX
                </a>
              ) : (
                <span className="rounded-md border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100">
                  UPSTOX CONNECTED
                </span>
              )}
              <button
                onClick={fetchAll}
                className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100"
                type="button"
              >
                REFRESH
              </button>
              <button
                onClick={fetchAll}
                className="rounded-md border border-sky-500/30 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100"
                type="button"
              >
                SCAN NOW
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-xs text-zinc-300 sm:grid-cols-2 lg:grid-cols-4">
            <InfoPair label="CONNECTION" value={status?.upstoxConnected ? "UPSTOX CONNECTED" : "UPSTOX DISCONNECTED"} />
            <InfoPair
              label="TOKEN"
              value={status?.sessionExpired ? "UPSTOX SESSION EXPIRED" : status?.tokenExpiry ?? "No expiry info"}
            />
            <InfoPair label="LAST DATA UPDATE" value={summary?.lastScannerUpdate ?? "—"} />
            <InfoPair label="MARKET STATUS" value={status?.marketStatus ?? "—"} />
          </div>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-[#0d1322] p-4">
          <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-6">
            <InfoPair label="NSE MARKET" value="09:15 — 15:30" />
            <InfoPair label="CURRENT IST" value={istTime} />
            <InfoPair label="STATUS" value={status?.marketStatus ?? "—"} />
            <InfoPair label="LAST SCANNER UPDATE" value={summary?.lastScannerUpdate ?? "—"} />
            <InfoPair label="NEXT REFRESH" value={summary?.nextRefreshAt ?? "—"} />
            <InfoPair label="DATA FRESHNESS" value={summary?.dataFreshness ?? "UNKNOWN"} />
          </div>
        </section>

        {error ? (
          <section className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            MARKET DATA UNAVAILABLE
          </section>
        ) : null}

        {!loading && status && !status.upstoxConnected ? (
          <section className="rounded-xl border border-amber-300/35 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">UPSTOX DISCONNECTED</p>
            <p className="text-amber-50/90">Connect Upstox to start market scanning.</p>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summaryCards.map((card) => (
            <article key={card.label} className="rounded-xl border border-zinc-800 bg-[#0d1322] p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-400">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-[#0d1322] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="rounded-md border border-zinc-700 bg-[#0a0f1b] px-3 py-2 text-xs text-zinc-100"
              placeholder="Search stock"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <Select label="State" value={stateFilter} onChange={setStateFilter} options={["ALL", "WATCH", "SETUP", "CONFIRMED", "FAKE_BREAKOUT", "NO_TRADE", "INVALID"]} />
            <Select label="Direction" value={directionFilter} onChange={setDirectionFilter} options={["ALL", "BUY", "SELL", "NEUTRAL"]} />
            <Select label="Volume" value={volumeFilter} onChange={setVolumeFilter} options={["ALL", "NORMAL", "STAR_1", "STAR_2", "STAR_3"]} />
            <Select label="Level" value={levelFilter} onChange={setLevelFilter} options={["ALL", "YH", "YL", "NONE"]} />

            <label className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-[#0a0f1b] px-3 py-2 text-xs">
              <input type="checkbox" checked={onlySetups} onChange={(e) => setOnlySetups(e.target.checked)} />
              Only setups
            </label>
            <label className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-[#0a0f1b] px-3 py-2 text-xs">
              <input type="checkbox" checked={onlyConfirmed} onChange={(e) => setOnlyConfirmed(e.target.checked)} />
              Only confirmed
            </label>
          </div>

          <div className="overflow-auto rounded-lg border border-zinc-800">
            <table className="min-w-[1800px] text-left text-xs">
              <thead className="sticky top-0 bg-[#10182b] text-zinc-300">
                <tr>
                  {[
                    ["Rank", "rank"],
                    ["Stock", null],
                    ["LTP", "ltp"],
                    ["Day %", "dayChangePercent"],
                    ["YH", null],
                    ["YL", null],
                    ["MID", null],
                    ["R1", null],
                    ["R2", null],
                    ["R3", null],
                    ["S1", null],
                    ["S2", null],
                    ["S3", null],
                    ["Location", null],
                    ["Reaction", null],
                    ["Candle", null],
                    ["Volume", "volumeRatio"],
                    ["20 EMA", "emaDistancePercent"],
                    ["Direction", null],
                    ["State", "state"],
                    ["Entry", null],
                    ["SL", null],
                    ["Risk/Share", null],
                    ["Qty", null],
                    ["Score", "score"],
                    ["Reason", null],
                    ["Updated", null],
                  ].map(([label, field]) => (
                    <th key={label} className="whitespace-nowrap px-2 py-2 font-medium">
                      {field ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => {
                            const sf = field as SortField;
                            if (sortField === sf) {
                              setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                            } else {
                              setSortField(sf);
                              setSortDirection("asc");
                            }
                          }}
                        >
                          {label}
                          {sortField === field ? (sortDirection === "asc" ? "▲" : "▼") : null}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t border-zinc-900">
                      <td colSpan={27} className="px-2 py-3">
                        <div className="h-4 animate-pulse rounded bg-zinc-800" />
                      </td>
                    </tr>
                  ))
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={27} className="px-3 py-6 text-center text-zinc-400">
                      NO PRIME SETUPS CURRENTLY
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => (
                    <tr
                      key={row.instrumentKey}
                      className="cursor-pointer border-t border-zinc-900 hover:bg-zinc-900/25"
                      onClick={() => setSelectedStock(row)}
                    >
                      <td className="px-2 py-2">{row.rank}</td>
                      <td className="px-2 py-2 font-semibold text-zinc-100">{row.stock}</td>
                      <td className="px-2 py-2">{fmtNum(row.ltp)}</td>
                      <td className="px-2 py-2">{fmtPct(row.dayChangePercent)}</td>
                      <td className="px-2 py-2">{fmtNum(row.levels.yh)}</td>
                      <td className="px-2 py-2">{fmtNum(row.levels.yl)}</td>
                      <td className="px-2 py-2">MID — RULE NOT VERIFIED</td>
                      <td className="px-2 py-2">R1 — RULE NOT VERIFIED</td>
                      <td className="px-2 py-2">R2 — RULE NOT VERIFIED</td>
                      <td className="px-2 py-2">R3 — RULE NOT VERIFIED</td>
                      <td className="px-2 py-2">S1 — RULE NOT VERIFIED</td>
                      <td className="px-2 py-2">S2 — RULE NOT VERIFIED</td>
                      <td className="px-2 py-2">S3 — RULE NOT VERIFIED</td>
                      <td className="px-2 py-2">{row.location || "—"}</td>
                      <td className="max-w-[160px] truncate px-2 py-2">{row.reaction.reactionType}</td>
                      <td className="px-2 py-2">{row.candle?.candleBias ?? "—"}</td>
                      <td className="px-2 py-2">{volumeLabel(row.volumeClass, row.volumeRatio)}</td>
                      <td className="px-2 py-2">{fmtNum(row.ema20)}</td>
                      <td className="px-2 py-2">{row.direction}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATE_COLORS[row.state]}`}>
                          {row.state}
                        </span>
                      </td>
                      <td className="px-2 py-2">—</td>
                      <td className="px-2 py-2">{fmtMoney(row.sl)}</td>
                      <td className="px-2 py-2">—</td>
                      <td className="px-2 py-2">—</td>
                      <td className="px-2 py-2">—</td>
                      <td className="max-w-[260px] truncate px-2 py-2 text-zinc-300">{row.reason}</td>
                      <td className="px-2 py-2">{fmtTime(row.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-zinc-800 bg-[#0d1322] p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-100">09:15–09:20 DISCOVERY</h2>
            <p className="mt-1 text-xs text-amber-200">DISCOVERY — NOT ENTRY</p>
            <div className="mt-3 space-y-2 text-xs">
              {rows.filter((r) => r.discoveryEligible).length === 0 ? (
                <p className="text-zinc-400">No discovery candidates currently.</p>
              ) : (
                rows
                  .filter((r) => r.discoveryEligible)
                  .slice(0, 12)
                  .map((r) => (
                    <div key={`disc-${r.instrumentKey}`} className="rounded border border-zinc-800 p-2 text-zinc-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{r.stock}</span>
                        <span>{r.reaction.touchedLevel}</span>
                      </div>
                      <p className="mt-1 text-zinc-400">{r.discoveryReason}</p>
                    </div>
                  ))
              )}
            </div>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-[#0d1322] p-4">
            <h2 className="text-sm font-semibold text-zinc-100">LIVE FEED</h2>
            <p className="mt-2 text-xs text-zinc-400">WAITING FOR MARKET DATA WORKER</p>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-[#0d1322] p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Candidate Detail</h2>

          {!selectedStock ? (
            <p className="mt-2 text-xs text-zinc-400">Select a stock row to inspect Prime pipeline details.</p>
          ) : (
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Panel title="Overview">
                  <KeyVal label="Stock" value={selectedStock.stock} />
                  <KeyVal label="LTP" value={fmtMoney(selectedStock.ltp)} />
                  <KeyVal label="Day %" value={fmtPct(selectedStock.dayChangePercent)} />
                  <KeyVal label="F&O Contract" value={selectedStock.futureInstrumentKey ?? "—"} />
                  <KeyVal label="Lot Size" value={selectedStock.lotSize ? String(selectedStock.lotSize) : "—"} />
                  <KeyVal label="Prime State" value={selectedStock.state} />
                  <KeyVal label="Reason" value={selectedStock.reason} />
                  <KeyVal label="Historical candle timestamp" value={selectedStock.latestCandle?.timestamp ?? "—"} />
                  <KeyVal
                    label="Data freshness"
                    value={
                      selectedStock.dataFreshnessSeconds !== null
                        ? `${selectedStock.dataFreshnessSeconds}s`
                        : "UNKNOWN"
                    }
                  />
                </Panel>

                <Panel title="Prime Pipeline">
                  <PipelineStep label="LEVEL" value={selectedStock.reaction.touchedLevel === "NONE" ? "WAIT" : "PASS"} />
                  <PipelineStep
                    label="REACTION"
                    value={selectedStock.reaction.reactionType === "NO_CLEAR_REACTION" ? "WAIT" : "PASS"}
                  />
                  <PipelineStep label="CANDLE" value={selectedStock.candle ? "PASS" : "NOT AVAILABLE"} />
                  <PipelineStep label="VOLUME" value={selectedStock.volumeClass ? "PASS" : "NOT AVAILABLE"} />
                  <PipelineStep label="20 EMA" value={selectedStock.ema20 ? "PASS" : "NOT AVAILABLE"} />
                  <PipelineStep label="CONFIRMATION" value="WAIT" />
                  <PipelineStep label="SL" value={selectedStock.sl ? `₹${selectedStock.sl.toFixed(2)}` : "NOT AVAILABLE"} />
                  <PipelineStep
                    label="QTY"
                    value={selectedStock.entry && selectedStock.sl && selectedStock.lotSize ? "PASS" : "WAIT"}
                  />
                </Panel>

                <Panel title="Reaction Panel">
                  <p className="text-xs text-zinc-300">Do not trade the line. Trade the reaction to the line.</p>
                  <div className="mt-2 space-y-1 text-xs text-zinc-200">
                    <p>LEVEL TOUCHED: {selectedStock.reaction.touchedLevel}</p>
                    <p>REACTION: {selectedStock.reaction.reactionType}</p>
                    <p>DIRECTION: {selectedStock.direction}</p>
                    <p>STRUCTURAL SL: {fmtMoney(selectedStock.reaction.structuralSl)}</p>
                  </div>
                </Panel>

                <Panel title="Fake Breakout Panel">
                  <p className="text-xs text-zinc-300">BREAK → FAILURE TO HOLD → RECLAIM/CLOSE → CONFIRMATION → OPPOSITE TRADE</p>
                  <p className="mt-2 text-xs text-zinc-200">
                    {selectedStock.state === "FAKE_BREAKOUT"
                      ? "Fake breakout sequence under watch; confirmation still required."
                      : "No active fake breakout sequence on selected candle."}
                  </p>
                </Panel>
              </div>

              <div className="space-y-4">
                <Panel title="Level Panel">
                  <KeyVal label="Price" value={fmtMoney(selectedStock.ltp)} />
                  <KeyVal label="Yesterday High" value={fmtMoney(selectedStock.levels.yh)} />
                  <KeyVal label="Yesterday Low" value={fmtMoney(selectedStock.levels.yl)} />
                  <KeyVal label="MID" value="RULE NOT VERIFIED" />
                  <KeyVal label="R1/R2/R3" value="RULE NOT VERIFIED" />
                  <KeyVal label="S1/S2/S3" value="RULE NOT VERIFIED" />
                </Panel>

                <Panel title="5-minute Candle Panel">
                  <KeyVal label="Open" value={fmtMoney(selectedStock.latestCandle?.open ?? null)} />
                  <KeyVal label="High" value={fmtMoney(selectedStock.latestCandle?.high ?? null)} />
                  <KeyVal label="Low" value={fmtMoney(selectedStock.latestCandle?.low ?? null)} />
                  <KeyVal label="Close" value={fmtMoney(selectedStock.latestCandle?.close ?? null)} />
                  <KeyVal label="Range" value={fmtNum(selectedStock.candle?.range ?? null)} />
                  <KeyVal label="Body" value={fmtNum(selectedStock.candle?.body ?? null)} />
                  <KeyVal label="Upper Wick" value={fmtNum(selectedStock.candle?.upperWick ?? null)} />
                  <KeyVal label="Lower Wick" value={fmtNum(selectedStock.candle?.lowerWick ?? null)} />
                  <KeyVal label="Body %" value={fmtPct(selectedStock.candle?.bodyPercent ?? null)} />
                  <KeyVal label="Close Location" value={selectedStock.candle?.closeLocation ?? "—"} />
                  <KeyVal label="Volume" value={fmtNum(selectedStock.latestCandle?.volume ?? null)} />
                  <KeyVal label="Volume Ratio" value={selectedStock.volumeRatio ? `${selectedStock.volumeRatio.toFixed(2)}×` : "—"} />
                  <KeyVal label="20 EMA" value={fmtMoney(selectedStock.ema20)} />
                </Panel>

                <RiskCalculator row={selectedStock} />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function RiskCalculator({ row }: { row: PrimeScanRow }) {
  const [capital, setCapital] = useState("100000");
  const [riskPercent, setRiskPercent] = useState("1");

  const result = useMemo(() => {
    const cap = Number(capital);
    const risk = Number(riskPercent);

    if (!Number.isFinite(cap) || !Number.isFinite(risk) || cap <= 0 || risk <= 0) {
      return { budget: null, riskPerShare: null, qty: null };
    }

    const budget = cap * (risk / 100);

    if (row.entry == null || row.sl == null || row.lotSize == null) {
      return { budget, riskPerShare: null, qty: null };
    }

    const riskPerShare = Math.abs(row.entry - row.sl);
    if (riskPerShare <= 0) return { budget, riskPerShare: null, qty: null };

    const rawQty = Math.floor(budget / riskPerShare);
    const lotRounded = Math.floor(rawQty / row.lotSize) * row.lotSize;

    return {
      budget,
      riskPerShare,
      qty: lotRounded > 0 ? lotRounded : null,
    };
  }, [capital, riskPercent, row.entry, row.sl, row.lotSize]);

  return (
    <Panel title="Risk Panel">
      <label className="mb-2 block text-xs text-zinc-300">
        Account Capital
        <input
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-700 bg-[#0a0f1b] px-2 py-1 text-zinc-100"
        />
      </label>
      <label className="mb-2 block text-xs text-zinc-300">
        Risk %
        <input
          value={riskPercent}
          onChange={(e) => setRiskPercent(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-700 bg-[#0a0f1b] px-2 py-1 text-zinc-100"
        />
      </label>

      <KeyVal label="Risk Budget" value={result.budget !== null ? fmtMoney(result.budget) : "—"} />
      <KeyVal label="Entry" value={row.entry !== null ? fmtMoney(row.entry) : "WAITING FOR ENTRY/SL"} />
      <KeyVal label="Structural SL" value={row.sl !== null ? fmtMoney(row.sl) : "WAITING FOR ENTRY/SL"} />
      <KeyVal
        label="Risk / Share"
        value={result.riskPerShare !== null ? fmtMoney(result.riskPerShare) : "WAITING FOR ENTRY/SL"}
      />
      <KeyVal label="Lot Size" value={row.lotSize !== null ? String(row.lotSize) : "—"} />
      <KeyVal label="Calculated Quantity" value={result.qty !== null ? String(result.qty) : "QTY — WAITING FOR ENTRY/SL"} />
    </Panel>
  );
}

function fmtNum(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

function fmtPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function fmtMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return INR.format(value);
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function volumeLabel(volumeClass: PrimeScanRow["volumeClass"], ratio: number | null) {
  const label =
    volumeClass === "STAR_3"
      ? "★★★"
      : volumeClass === "STAR_2"
        ? "★★"
        : volumeClass === "STAR_1"
          ? "★"
          : volumeClass === "NORMAL"
            ? "NORMAL"
            : "—";

  if (ratio == null) return label;
  return `${label} (${ratio.toFixed(2)}×)`;
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-[#0a0f1b] px-2 py-2 text-xs">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-zinc-200 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#0a0f1b]">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">{label}</p>
      <p className="mt-0.5 text-xs text-zinc-200">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-[#0a0f1b] p-3">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-200">{title}</h3>
      <div className="mt-2 space-y-1">{children}</div>
    </article>
  );
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-zinc-400">{label}</span>
      <span className="text-right text-zinc-200">{value}</span>
    </div>
  );
}

function PipelineStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

function getSortValue(row: PrimeScanRow, field: SortField): number {
  if (field === "state") return STATE_PRIORITY[row.state];
  if (field === "distanceToYh") {
    if (row.ltp == null || row.levels.yh == null) return Number.POSITIVE_INFINITY;
    return Math.abs(row.ltp - row.levels.yh);
  }
  if (field === "distanceToYl") {
    if (row.ltp == null || row.levels.yl == null) return Number.POSITIVE_INFINITY;
    return Math.abs(row.ltp - row.levels.yl);
  }

  const map: Record<Exclude<SortField, "state" | "distanceToYh" | "distanceToYl">, number | null> = {
    rank: row.rank,
    ltp: row.ltp,
    dayChangePercent: row.dayChangePercent,
    volumeRatio: row.volumeRatio,
    emaDistancePercent: row.emaDistancePercent,
    score: row.score,
  };

  return map[field] ?? -Infinity;
}
