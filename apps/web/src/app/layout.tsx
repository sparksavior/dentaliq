import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { ClinicProvider } from "@/contexts/clinic-context";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DentalIQ — AI Insurance Intelligence",
  description:
    "AI-powered dental insurance estimation, claim risk detection, and coverage explanation for Canadian dental practices.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: apply saved theme class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;var k=p.startsWith('/dashboard')?'diq_dash_theme':'diq_pub_theme';var t=localStorage.getItem(k);var h=document.documentElement;if(t==='dark')h.classList.add('dark');else if(t==='light')h.classList.add('light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-full">
        <AuthProvider>
          <ClinicProvider>{children}</ClinicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
