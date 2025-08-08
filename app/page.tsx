
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie } from "recharts";
import { TrendingUp, Wallet, PlusCircle, MinusCircle, Bitcoin, PieChart as PieIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Utils
const fmtEUR = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

function calcProjection({ initial, monthly, annualRate, years, inflation = 0 }: { initial: number; monthly: number; annualRate: number; years: number; inflation?: number; }) {
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
    out.push({ idx: m, date: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }), nominal: balanceNominal, real: balanceReal, contribution: initial + monthly * m });
  }
  return out;
}

function weightedExpectedReturn(legs: { value: number; exp: number }[]) {
  const total = legs.reduce((s, l) => s + (isFinite(l.value) ? l.value : 0), 0);
  if (total <= 0) return 0;
  return legs.reduce((s, l) => s + (l.value * l.exp), 0) / total;
}

export default function PatrimoineApp() {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  async function fetchBtc() {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur");
      const j = await res.json();
      if (j?.bitcoin?.eur) setBtcPrice(j.bitcoin.eur);
    } catch (e) {}
  }
  useEffect(() => { fetchBtc(); const id = setInterval(fetchBtc, 20000); return () => clearInterval(id); }, []);

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

  const [years, setYears] = useState<5 | 10 | 20>(20);
  const [autoRate, setAutoRate] = useState(true);
  const [manualRate, setManualRate] = useState(0.06);

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

  const autoAnnualRate = weightedExpectedReturn((Object.keys(pockets) as PocketKey[]).map((k) => ({ value: nowInitials[k], exp: pockets[k].exp })));
  const annualRate = autoRate ? autoAnnualRate : manualRate;

  const pocketsSeries = useMemo(() => {
    const keys = Object.keys(pockets) as PocketKey[];
    const map: Record<PocketKey, ReturnType<typeof calcProjection>> = {} as any;
    for (const k of keys) {
      map[k] = calcProjection({ initial: nowInitials[k], monthly: monthlyTotals[k], annualRate: pockets[k].exp, years, inflation: 0 });
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
  const v5 = getAtYears(5);
  const v10 = getAtYears(10);
  const v20 = getAtYears(20);

  const allocationData = (Object.keys(pockets) as PocketKey[])
    .map((k) => ({ name: pockets[k].label, value: Math.max(0, nowInitials[k]) }))
    .filter((d) => d.value > 0);

  useEffect(() => {
    try {
      const z = calcProjection({ initial: 0, monthly: 0, annualRate: 0, years: 1, inflation: 0 });
      console.assert(Math.abs(z[z.length - 1].nominal - 0) < 1e-9, "calcProjection zero -> 0");
      const t2 = calcProjection({ initial: 0, monthly: 100, annualRate: 0, years: 1, inflation: 0 });
      console.assert(Math.abs(t2[t2.length - 1].nominal - 1200) < 1e-6, "monthly no interest -> 1200");
      const wr = weightedExpectedReturn([{ value: 100, exp: 0.1 }, { value: 100, exp: 0.05 }]);
      console.assert(Math.abs(wr - 0.075) < 1e-9, "weightedExpectedReturn basic");
      console.log("✅ Tests OK");
    } catch (e) { console.warn("❌ Tests failed", e); }
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-900">
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
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <Card className="xl:col-span-7">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5"/> Mes poches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(pockets) as PocketKey[]).map((k) => (
                  <div key={k} className="space-y-2 p-3 border rounded-xl">
                    <div className="font-medium text-slate-700">{pockets[k].label}</div>
                    <LabeledNumber label="Solde initial" value={pockets[k].initial} onChange={(v) => updatePocket(k, { initial: v })} step={500} />
                    <LabeledNumber label="Apport mensuel" value={pockets[k].monthly} onChange={(v) => updatePocket(k, { monthly: v })} step={50} />
                    <LabeledPercent label="Rendement attendu" value={pockets[k].exp} onChange={(v) => updatePocket(k, { exp: v })} step={0.005} />
                    {k === "crypto" && (
                      <>
                        <LabeledNumber label="Bitcoin – quantité (BTC)" value={btcHold} onChange={setBtcHold} step={0.01} />
                        <ReadOnly label="Valeur BTC incluse" value={btcPrice ? fmtEUR(cryptoExtra) : "–"} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5"/> Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ReadOnly label="Solde initial (total)" value={fmtEUR(totalInitial)} />
              <ReadOnly label="Apport mensuel (total)" value={fmtEUR(totalMonthly)} />

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-600">Taux de rendement</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Auto</span>
                  <input type="checkbox" className="h-4 w-4" checked={autoRate} onChange={(e) => setAutoRate(e.target.checked)} />
                </div>
              </div>
              {autoRate ? (
                <ReadOnly label="Taux (pondéré par l'allocation)" value={fmtPct(annualRate || 0)} />
              ) : (
                <LabeledPercent label="Taux manuel (global)" value={manualRate} onChange={setManualRate} step={0.0025} />
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-600">Horizon</span>
                <div className="flex items-center gap-2">
                  {[5, 10, 20].map(y => (
                    <Button key={y} variant={y === years ? "default" : "outline"} size="sm" onClick={() => setYears(y as 5|10|20)}>
                      {y} ans
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <Card className="xl:col-span-7">
            <CardHeader>
              <CardTitle>Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" interval={Math.floor(data.length / 8)} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : `${v}`} width={60} />
                    <Tooltip formatter={(v: any) => fmtEUR(v as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="totalNominal" dot={false} strokeWidth={2} name="Valeur" />
                    <Line type="monotone" dataKey="contribution" dot={false} strokeWidth={1.5} strokeDasharray="4 4" name="Contributions cumulées" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-5">
            <CardHeader>
              <CardTitle>Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    />
                    <Tooltip formatter={(v: any) => fmtEUR(v as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard title="Dans 5 ans" value={fmtEUR(v5)} subtitle={`Taux global: ${fmtPct(annualRate || 0)} • Mensuel: ${fmtEUR(totalMonthly)}`} />
          <KpiCard title="Dans 10 ans" value={fmtEUR(v10)} subtitle={`Apports cumulés: ${fmtEUR(totalInitial + totalMonthly * 120)}`} />
          <KpiCard title="Dans 20 ans" value={fmtEUR(v20)} subtitle={`Intérêts cumulés estimés`} />
        </section>
      </div>
    </div>
  );
}

// UI helpers
function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function LabeledNumber({ label, value, onChange, step = 100 }: { label: string; value: number; onChange: (v: number) => void; step?: number; }) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="flex items-center gap-2">
        <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onChange(Math.max(0, value - step))}><MinusCircle className="h-4 w-4"/></Button>
          <Button variant="outline" size="icon" onClick={() => onChange(value + step)}><PlusCircle className="h-4 w-4"/></Button>
        </div>
      </div>
    </div>
  );
}

function LabeledPercent({ label, value, onChange, step = 0.005 }: { label: string; value: number; onChange: (v: number) => void; step?: number; }) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-slate-600">{label} ({(value * 100).toFixed(2)}%)</div>
      <div className="flex items-center gap-2">
        <Input type="number" step={0.001} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onChange(Math.max(0, value - step))}><MinusCircle className="h-4 w-4"/></Button>
          <Button variant="outline" size="icon" onClick={() => onChange(value + step)}><PlusCircle className="h-4 w-4"/></Button>
        </div>
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="px-3 py-2 rounded-md border bg-white text-sm">{value}</div>
    </div>
  );
}

function BtcPriceBadge({ price, onRefresh }: { price: number | null; onRefresh: () => void }) {
  return (
    <button onClick={onRefresh} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm text-slate-700 bg-white shadow-sm hover:bg-slate-50">
      <Bitcoin className="h-4 w-4"/>
      BTC: {typeof price === "number" ? fmtEUR(price) : "–"}
    </button>
  );
}
