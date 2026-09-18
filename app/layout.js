import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata = {
  title: SITE.headline,
  description: "One full sales call and the consultancy session that followed, recorded and unedited. One-time payment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="wrap">
          {children}
          <footer>Payments, tax and receipts are handled by FastSpring.</footer>
        </div>
      </body>
    </html>
  );
}
