"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

/** Heart + ECG pulse logo: white heart outline, bold emerald pulse line,
 *  inside a rounded teal tile with an emerald border ring. */
export function HeartLogo({ size = 40 }: { size?: number }) {
  return (
    <span className="heart-logo" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="#0f766e" stroke="#10b981" strokeWidth="2.5" />
        <path
          d="M20 31 C12.5 25.5 9 21.5 9 17 C9 13.5 11.5 11 14.5 11 C16.8 11 18.8 12.4 20 14.2 C21.2 12.4 23.2 11 25.5 11 C28.5 11 31 13.5 31 17 C31 21.5 27.5 25.5 20 31 Z"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M12.5 20.5 h4 l1.8-3.6 2.6 6.4 1.7-2.8 h4.9"
          stroke="#10b981"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v5.5a4 4 0 0 0 8 0V3" />
      <path d="M10 3v2" />
      <path d="M14 3v2" />
      <path d="M10 17.5V19a3 3 0 0 0 6 0v-1.5" />
      <circle cx="16" cy="17.5" r="1.6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

const SEGMENTS = [
  { href: "/", label: "Patients", icon: <PersonIcon />, match: (p: string) => p === "/" || p.startsWith("/patients") },
  { href: "/alerts", label: "Alerts", icon: <BellIcon />, match: (p: string) => p.startsWith("/alerts") },
  { href: "/check", label: "Check risk", icon: <StethoscopeIcon />, match: (p: string) => p.startsWith("/check") },
  { href: "/upload", label: "Upload CSV", icon: <UploadIcon />, match: (p: string) => p.startsWith("/upload") },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [openAlerts, setOpenAlerts] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .dashboard()
      .then((d) => {
        if (!cancelled) setOpenAlerts(d.open_alerts);
      })
      .catch(() => {
        if (!cancelled) setOpenAlerts(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="site">
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/" className="wordmark" aria-label="HeartRisk home">
          <HeartLogo />
          <span className="wordmark-text">HeartRisk</span>
        </Link>

        <div className="segmented" role="navigation" aria-label="Sections">
          {SEGMENTS.map((s) => {
            const active = s.match(pathname ?? "/");
            return (
              <Link key={s.href} href={s.href} className={active ? "seg active" : "seg"} aria-current={active ? "page" : undefined}>
                <span className="seg-icon">{s.icon}</span>
                <span className="seg-label">{s.label}</span>
              </Link>
            );
          })}
        </div>

        <Link href="/alerts" className="bell-btn" aria-label={openAlerts ? `${openAlerts} open alerts` : "Open alerts"}>
          <BellIcon />
          {openAlerts !== null && openAlerts > 0 && (
            <span className="bell-badge" aria-hidden="true">
              {openAlerts > 99 ? "99+" : openAlerts}
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}
