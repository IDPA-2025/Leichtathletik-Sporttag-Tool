import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="bg-blue-pattern flex justify-center items-center min-h-screen">
          <div className="content-container flex flex-col justify-center items-center">{children}</div>
      </body>
    </html>
  );
}