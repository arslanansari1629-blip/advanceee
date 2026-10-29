import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BotForge Admin — Fleet control",
  description:
    "Advanced admin console for BotForge Cloud: bots, live logs, revenue, users, feature flags and system health.",
};

export const viewport: Viewport = {
  themeColor: "#07090f",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('bf-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var s = localStorage.getItem('bf-sidebar') || 'expanded';
    document.documentElement.setAttribute('data-sidebar', s);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
