import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata = {
  title: "HeartRisk — Heart Attack Risk Prediction",
  description: "Predict heart attack risk from patient vitals with an XGBoost model, and get an alert when risk is high. Demo with simulated patients — not for clinical use.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="site">
          <nav className="site-nav">
            <Link href="/" className="wordmark" aria-label="HeartRisk home">
              <span className="wordmark-mark" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              HeartRisk
            </Link>
            <span className="nav-links">
              <Link href="/">Patients</Link>
              <Link href="/alerts">Alerts</Link>
              <Link href="/check">Check risk</Link>
            </span>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="disclaimer">
          Demo / educational project with simulated patients. The model is trained
          on the UCI Cleveland heart disease dataset (303 rows). This is not a
          medical device and must not be used for clinical decisions — always
          consult a qualified clinician.
        </footer>
      </body>
    </html>
  );
}
