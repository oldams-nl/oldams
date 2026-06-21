import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "oldams — historical photographs of Amsterdam on a map";
const DESCRIPTION =
  "Explore ~38,000 historical photographs of Amsterdam from the Stadsarchief " +
  "Amsterdam city archive, pinned to the addresses where they were taken. " +
  "Travel through time from the 1650s to the 1990s.";

export const metadata: Metadata = {
  metadataBase: new URL("https://oldams.nl"),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Amsterdam",
    "history",
    "historical photos",
    "Stadsarchief Amsterdam",
    "beeldbank",
    "oude foto's Amsterdam",
    "map",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://oldams.nl",
    siteName: "oldams",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1a1714",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
