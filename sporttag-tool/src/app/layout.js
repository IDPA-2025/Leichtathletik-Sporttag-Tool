import "./globals.css";
import BackButton from "@/app/components/BackButton";

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}
      <BackButton/>
      </body>
    </html>
  );
}