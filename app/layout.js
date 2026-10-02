import "./globals.css";
import { SITE } from "@/lib/site";
import Analytics from "@/components/Analytics";

export const viewport = { themeColor: "#0E0E10" };

export const metadata = {
  title: `${SITE.headline} by ${SITE.name}`,
  description: SITE.lede,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Analytics />
        <div className="wrap">
          {children}
          <footer>
            <span>Card payments and receipts by Stripe.</span>
            <span>
              <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">Instagram</a> · {SITE.domain}
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
