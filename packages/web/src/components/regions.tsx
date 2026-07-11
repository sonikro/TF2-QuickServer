import "flag-icons/css/flag-icons.min.css";
import { FaCloud } from "react-icons/fa";

const OCI_REGIONS = [
  { name: "Santiago", code: "cl" },
  { name: "São Paulo", code: "br" },
  { name: "Bogotá", code: "co" },
  { name: "Chicago", code: "us" },
  { name: "Frankfurt", code: "de" },
  { name: "Sydney", code: "au" },
];

const AWS_REGIONS = [
  { name: "Buenos Aires", code: "ar" },
  { name: "Lima", code: "pe" },
];

export default function Regions() {
  return (
    <section id="regions" className="section-anchor py-24 bg-section-bg">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3">
          Supported Regions
        </h2>
        <p className="text-lg text-text-muted text-center max-w-lg mx-auto">
          Global coverage for low-latency gameplay
        </p>
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
            <h5 className="text-lg font-semibold mb-4">
              <FaCloud className="text-blue-500 me-2 inline" />
              Oracle Cloud Infrastructure
            </h5>
            <ul className="list-none p-0 m-0 space-y-3">
              {OCI_REGIONS.map((region) => (
                <li
                  key={region.code}
                  className="flex items-center gap-3 text-base"
                >
                  <span
                    className={`fi fi-${region.code} w-7 h-5 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.4)] shrink-0`}
                  />
                  {region.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
            <h5 className="text-lg font-semibold mb-4">
              <FaCloud className="text-yellow-500 me-2 inline" />
              AWS Local Zones{" "}
              <span className="inline-block bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
                Experimental
              </span>
            </h5>
            <ul className="list-none p-0 m-0 space-y-3">
              {AWS_REGIONS.map((region) => (
                <li
                  key={region.code}
                  className="flex items-center gap-3 text-base"
                >
                  <span
                    className={`fi fi-${region.code} w-7 h-5 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.4)] shrink-0`}
                  />
                  {region.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
