import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { supabase} from "../../lib/supabaseClient";

export async function POST(req) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Benutzername und Passwort sind erforderlich" }, { status: 400 });
        }

        // Benutzer aus Supabase abrufen
        const { data: user, error } = await supabase
            .from('profiles')
            .select('id, username, password, role')
            .eq('username', username)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 401 });
        }

        // Passwort prüfen
        const bcrypt = await import('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
        }

        // JWT-Token generieren
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Cookie setzen
        const cookie = serialize('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            path: "/",
            maxAge: 3600 // 1 Stunde
        }
        );

        const response = NextResponse.json({ success: true, role: user.role });
        response.headers.set('Set-Cookie', cookie);
        console.log("✅ Login erfolgreich! Cookie:", cookie );

        return response;

    } catch (err) {
        console.error("🔥 Serverfehler:", err);
        return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
    }
}
