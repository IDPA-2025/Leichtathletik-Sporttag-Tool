import { NextResponse } from 'next/server';

export function middleware(req) {
    console.log("🛠 Middleware gestartet für:", req.nextUrl.pathname);

    const tokenCookie = req.cookies.get("authToken");
    console.log("🔍 Token aus Cookies:", tokenCookie);

    if (!tokenCookie) {
        console.log("🚫 Kein Token gefunden! Umleitung zu /login");
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const token = tokenCookie.value;
        console.log("📜 Token:", token);

        // JWT manuell decodieren (Edge Runtime kompatibel)
        const payloadBase64 = token.split('.')[1]; // JWT besteht aus Header.Payload.Signatur
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

        console.log("✅ Token gültig! Benutzer:", decoded);

        if (req.nextUrl.pathname.startsWith("/upload") && decoded.role !== "lehrer") {
            return NextResponse.redirect(new URL("/menu", req.url));
        }

        // **Wenn Helfer auf /upload zugreifen will → Kein Redirect, aber Header setzen**
        if (req.nextUrl.pathname.startsWith("/upload") && decoded.role !== "lehrer") {
            console.log("⚠️ Helfer versucht auf /upload zuzugreifen → Alert auslösen im Frontend!");

            const response = NextResponse.next();
            response.headers.set("X-Access-Denied", "true"); // Custom Header setzen
            return response;
        }

        return NextResponse.next();
    } catch (error) {
        console.error("❌ JWT Verify Fehler:", error.message);
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

// Middleware aktivieren
export const config = {
    matcher: ["/menu","/sports/:path*", "/upload"], // Middleware für diese Routen aktivieren
};
