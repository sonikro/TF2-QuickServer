"use client";

import { useEffect, useState } from "react";

const STATS = [
  { value: "9,700+", label: "Servers Created", desc: "All-time total" },
  { value: "34K+", label: "Player Connections", desc: "And counting" },
  { value: "2,853", label: "Unique Players", desc: "Served across all regions" },
  { value: "15K+", label: "Hours Played", desc: "Total server uptime" },
  { value: "209", label: "Maps Played", desc: "Unique maps hosted" },
];

const FIRST_SERVER_TS = 1746401054799;

export default function Stats() {
  const [daysRunning, setDaysRunning] = useState<string>("—");
  const [daysDesc, setDaysDesc] = useState<string>("Since May 2025");

  useEffect(() => {
    const msPerDay = 86400000;
    const now = Date.now();
    const days = Math.floor((now - FIRST_SERVER_TS) / msPerDay);
    setDaysRunning(days.toLocaleString());

    const startDate = new Date(FIRST_SERVER_TS);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    setDaysDesc(
      "Since " + months[startDate.getMonth()] + " " + startDate.getFullYear()
    );
  }, []);

  return (
    <section id="stats" className="section-anchor py-24 bg-section-bg">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3">
          By the Numbers
        </h2>
        <p className="text-lg text-text-muted text-center max-w-lg mx-auto">
          The TF2-QuickServer platform in real data
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mt-8">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-card-bg border border-white/10 rounded-2xl p-6 text-center transition-all duration-250 hover:-translate-y-1 hover:border-accent/30"
            >
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-1 text-gradient">
                {stat.value}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#e6edf3] mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-text-muted">{stat.desc}</div>
            </div>
          ))}
          <div className="bg-card-bg border border-white/10 rounded-2xl p-6 text-center transition-all duration-250 hover:-translate-y-1 hover:border-accent/30">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-1 text-gradient">
              {daysRunning}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#e6edf3] mb-1">
              Days Running
            </div>
            <div className="text-xs text-text-muted">{daysDesc}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
