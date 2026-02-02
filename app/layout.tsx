import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Guesty Insights Engine",
  description: "OTA performance analytics and booking intelligence from Guesty PMS data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
