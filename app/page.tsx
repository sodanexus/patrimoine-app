"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, Wallet, PlusCircle, MinusCircle, Bitcoin,
  PieChart as PieIcon, Moon, Sun
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Utils
const fmtEUR = (v: number) =>
  v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

function calcProjection({
  initial, monthly, annualRate, years, inflation = 0
}: {
  initial: number; monthly: number; annualRate: number; years: number; inflation?: number;
}) {
  const months = years * 12;
  const rMonthly = annualRate / 12;
  const inflMonthly = inflation / 12;
  let balanceNominal = initial;
  let balanceReal = initial;
  const out: { idx: number; date: string; nominal: number; real: number; contribution: number }[] = [];
  const today = new Date();
  for (let m = 1; m <= months; m++) {
    balanceNominal = balanceNominal * (1 + rMonthly) + monthly;
    balanceReal = (balanceReal * (1 + rMonthly)) / (1 + inflMonthly) + monthly / (1 + inflMonthly);
    const d = new Date(today);
    d.setMonth(today.getMonth() + m);
    out.push({
      idx: m,
      date: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      nominal: balanceNominal,
      real: balanceReal,
      contribution: initial + monthly * m
    });
  }
  return out;
}

function weightedExpectedReturn(legs: { value: number; exp: number }[]) {
  const total = legs.reduce((s, l) => s + (isFinite(l.value) ? l.value : 0), 0);
  if (total <= 0) return 0;
  return legs.reduce((s, l) => s + (l.value * l.exp), 0) / total;
}

const COLORS = ["#4F46E5", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#F97316"];

export default function PatrimoineApp() {
  // --- Dark mode (persisté) ---
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Prix BTC
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  async function fetchBtc() {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur");
      const j = await res.json();
      if (j?.bitcoin?.eur) setBtcPrice(j.bitcoin.eur);
    } catch (e) {}
  }
  useEffect(() => { fetchBtc(); const id = setInterval(fetchBtc, 20000); return () => clearInterval(id); }, []);

  // Poches
  type PocketKey = "assurance" | "metaux" | "pea" | "livret" | "cto" | "crypto";
  type Pocket = { label: string; initial: number; monthly: number; exp: number };
  const [pockets, setPockets] = useState<Record<PocketKey, Pocket>>({
    assurance: { label: "Assurance-vie", initial: 0, monthly: 0, exp: 0.035 },
    metaux:    { label: "Métaux précieux", initial: 0, monthly: 0, exp: 0.02 },
    pea:       { label: "PEA", initial: 0, monthly: 0, exp: 0.06 },
    livret:    { label: "Livret", initial: 0, monthly: 0, exp: 0.03 },
    cto:       { label: "CTO", initial: 0, monthly: 0, exp: 0.05 },
    crypto:    { label: "Crypto", initial: 0, monthly: 0, exp: 0.10 },
  });
  const [btcHold, setBtcHold] = useState(0);
  function updatePocket<K extends PocketKey>(key: K, patch: Partial<Pocket>) {
    setPockets((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  // Paramètres
  const [years, setYears] = useState<5 | 10 | 20>(20);
  const [autoRate, setAutoRate] = useState(true);
  const [manualRate, setManualRate] = useState(0.06);

  // Dérivés
  const cryptoExtra = (btcPrice ?? 0) * btcHold;
  const nowInitials: Record<PocketKey, number> = {
    assurance: pockets.assurance.initial,
    metaux: pockets.metaux.initial,
    pea: pockets.pea.initial,
    livret: pockets.livret.initial,
    cto: pockets.cto.initial,
    crypto: pockets.crypto.initial + cryptoExtra,
  };
  const monthlyTotals: Record<PocketKey, number> = {
    assurance: pockets.assurance.monthly,
    metaux: pockets.metaux.monthly,
    pea: pockets.pea.monthly,
    livret: pockets.livret.monthly,
    cto: pockets.cto.monthly,
    crypto: pockets.crypto.monthly,
  };

  const totalInitial = Object.values(nowInitials).reduce((a, b) => a + b, 0);
  const totalMonthly = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);

  const autoAnnualRate = weightedExpectedReturn(
    (Object.keys(pockets) as PocketKey[]).map((k) => ({ value: nowInitials[k], exp: pockets[k].exp }))
  );
  const annualRate = autoRate ? autoAnnualRate : manualRate;

  const pocketsSeries = useMemo(() => {
    const keys = Object.keys(pockets) as PocketKey[];
    const map: Record<PocketKey, ReturnType<typeof calcProjection>> = {} as any;
    for (const k of keys) {
      map[k] = calcProjection({
        initial: nowInitials[k], monthly: monthlyTotals[k], annualRate: pockets[k].exp, years, inflation: 0
      });
    }
    return map;
  }, [JSON.stringify(nowInitials), JSON.stringify(monthlyTotals), JSON.stringify(pockets), years]);

  const data = useMemo(() => {
    const months = years * 12;
    const out: { idx: number; date: string; totalNominal: number; contribution: number }[] = [];
    for (let m = 1; m <= months; m++) {
      const date = pocketsSeries.crypto?.[m - 1]?.date || "";
      let sumN = 0;
      (Object.keys(pockets) as PocketKey[]).forEach((k) => {
        sumN += pocketsSeries[k]?.[m - 1]?.nominal || 0;
      });
      out.push({ idx: m, date, totalNominal: sumN, contribution: totalInitial + totalMonthly * m });
    }
    return out;
  }, [pocketsSeries, totalInitial, totalMonthly, years]);

  const getAtYears = (y: number) => data[y * 12 - 1]?.totalNominal ?? 0;
  const v5 = getAtYears(5), v10 = getAtYears(10), v20 = getAtYears(20);

  const allocationData = (Object.keys(pockets) as PocketKey[])
    .map((k, i) => ({ name: pockets[k].label, value: Math.max(0, nowInitials[k]), color: COLORS[i % COLORS.length] }))
    .filter((d) => d.value > 0);

  // Calcul apports / intérêts
  const apports5 = totalInitial + totalMonthly * (5 * 12);
  const interets5 = v5 - apports5;

  const apports10 = totalInitial + totalMonthly * (10 * 12);
  const interets10 = v10 - apports10;

  const apports20 = totalInitial + totalMonthly * (20 * 12);
  const interets20 = v20 - apports20;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight flex items-center gap-3">
              <PieIcon className="h-8 w-8" />
              Tableau de bord – Finances & Patrimoine
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <BtcPriceBadge price={btcPrice} onRefresh={fetchBtc} />
            <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)}
              className="border-slate-300 dark:border-slate-700">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Colonne gauche */}
          <div className="xl:col-span-8 space-y-6">
            {/* Mes poches */}
            {/* ... */}
            {/* Projection */}
            {/* ... */}
            {/* Allocation */}
            {/* ... */}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard title="Dans 5 ans" value={fmtEUR(v5)} subtitle={`Apports: ${fmtEUR(apports5)} • Intérêts: ${fmtEUR(interets5)}`} />
              <KpiCard title="Dans 10 ans" value={fmtEUR(v10)} subtitle={`Apports: ${fmtEUR(apports10)} • Intérêts: ${fmtEUR(interets10)}`} />
              <KpiCard title="Dans 20 ans" value={fmtEUR(v20)} subtitle={`Apports: ${fmtEUR(apports20)} • Intérêts: ${fmtEUR(interets20)}`} />
            </div>
          </div>

          {/* Colonne droite : Paramètres */}
          {/* ... */}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card className="dark:bg-slate-900 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-600 dark:text-slate-300">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

// autres composants : LabeledNumber, LabeledPercent, ReadOnly, BtcPriceBadge
