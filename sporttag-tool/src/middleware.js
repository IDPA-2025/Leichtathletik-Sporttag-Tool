// Middleware für geschützte Routen
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

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

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("✅ Token gültig! Benutzer:", decoded);

        return NextResponse.next();
    } catch (error) {
        console.error("❌ JWT Verify Fehler:", error.message);
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

// Middleware aktivieren
export const config = {
    matcher: [ "/sports/:path*", "/upload"],
    runtime: "nodejs",
};
