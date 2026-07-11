"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "Stats", href: "#stats" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Regions", href: "#regions" },
  { label: "Commands", href: "#commands" },
  { label: "Install Bot", href: "#install" },
] as const;

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const nav = document.querySelector("nav");
    const sections = document.querySelectorAll("section[id]");

    function updateActiveLink() {
      const navHeight = nav?.offsetHeight ?? 72;
      let current = "";
      sections.forEach((section) => {
        const top = section.getBoundingClientRect().top - navHeight - 10;
        if (top <= 0) {
          current = section.getAttribute("id") ?? "";
        }
      });
      setActiveSection(current);
    }

    updateActiveLink();
    window.addEventListener("scroll", updateActiveLink, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveLink);
  }, []);

  function handleNavClick(href: string) {
    setMobileOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  useEffect(() => {
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-bg/92 backdrop-blur-md border-b border-white/10 py-3">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 no-underline">
          <Image
            src="/logo.png"
            alt="TF2-QuickServer"
            width={36}
            height={36}
            className="inline-block align-middle"
          />
          <span className="font-bold text-lg text-white align-middle">
            TF2-QuickServer
          </span>
        </a>

        <button
          className="block lg:hidden text-white border-0 bg-transparent p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {mobileOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>

        <div
          className={`${
            mobileOpen ? "block" : "hidden"
          } lg:flex lg:items-center absolute lg:static top-full left-0 right-0 bg-dark-bg lg:bg-transparent border-b lg:border-0 border-white/10 lg:border-none`}
        >
          <ul className="flex flex-col lg:flex-row lg:items-center gap-1 p-4 lg:p-0 m-0 list-none">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium no-underline transition-colors duration-200 ${
                    activeSection === item.href.slice(1)
                      ? "text-accent"
                      : "text-text-muted hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
