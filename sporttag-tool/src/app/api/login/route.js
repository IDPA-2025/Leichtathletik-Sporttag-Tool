import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

// POST-Handler für Login
export async function POST(req) {
    try {
        // Anmeldedaten aus dem Request auslesen
        const { username, password } = await req.json();

        // Benutzer aus Supabase holen
        const { data: user, error } = await supabase
            .from('profiles')
            .select('id, username, password, role')
            .eq('username', username)
            .single();

        // Fehler wenn Benutzer nicht existiert
        if (error || !user) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 401 });
        }

        // Passwort überprüfen mit bcrypt
        const bcrypt = await import('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);

        // Fehler wenn Passwort falsch ist
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
        }

        // JWT-Token erstellen mit Benutzerinfo (id, username, role)
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Cookie serialisieren (HttpOnly, Secure, Strict)
        const cookie = serialize('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            path: "/",
            maxAge: 60 * 60 * 24
        });

        // Antwort mit Cookie und Rolle zurückgeben
        const response = NextResponse.json({ success: true, role: user.role });
        response.headers.set('Set-Cookie', cookie);

        return response;
    } catch (err) {
        // Fehler bei Serverproblemen
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }

}