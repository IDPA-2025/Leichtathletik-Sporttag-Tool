import jwt from 'jsonwebtoken'

// ⬅️ ZWINGEND bei Verwendung von jsonwebtoken
export const runtime = 'nodejs'

export async function GET(req) {
    const cookie = req.headers.get("cookie") || "";
    const token = cookie
        .split(";")
        .find(c => c.trim().startsWith("authToken="))
        ?.split("=")[1];

    if (!token) {
        return new Response(JSON.stringify({ error: "Kein Token" }), { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return new Response(JSON.stringify({
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Token ungültig" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
