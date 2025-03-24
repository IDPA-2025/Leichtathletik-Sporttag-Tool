import { NextResponse } from 'next/server';

export function middleware(req) {

    const tokenCookie = req.cookies.get("authToken");

    if (!tokenCookie) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const token = tokenCookie.value;

        // JWT manuell decodieren (Edge Runtime kompatibel)
        const payloadBase64 = token.split('.')[1]; // JWT besteht aus Header.Payload.Signatur
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());


        if (req.nextUrl.pathname.startsWith("/upload") && decoded.role !== "lehrer") {
            return NextResponse.redirect(new URL("/menu", req.url));
        }

        // **Wenn Helfer auf /upload zugreifen will → Kein Redirect, aber Header setzen**
        if (req.nextUrl.pathname.startsWith("/upload") && decoded.role !== "lehrer") {

            const response = NextResponse.next();
            response.headers.set("X-Access-Denied", "true"); // Custom Header setzen
            return response;
        }

        return NextResponse.next();
    } catch (error) {
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

// Middleware aktivieren
export const config = {
    matcher: ["/menu","/sports/:path*", "/upload"], // Middleware für diese Routen aktivieren
};
