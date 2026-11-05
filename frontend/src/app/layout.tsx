import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

export const metadata = {
  title: "HeartRisk — Heart Attack Risk Prediction",
  description: "Predict heart attack risk from patient vitals with an XGBoost model, and get an alert when risk is high. Demo with simulated patients — not for clinical use.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <SiteHeader />
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
