// ✅ login/route.js – POST: Login & Cookie setzen
import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export async function POST(req) {
    try {
        const { username, password } = await req.json();



        const { data: user, error } = await supabase
            .from('profiles')
            .select('id, username, password, role')
            .eq('username', username)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 401 });
        }

        const bcrypt = await import('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const cookie = serialize('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            path: "/",
            maxAge: 60 * 60 * 24
        });

        const response = NextResponse.json({ success: true, role: user.role });
        response.headers.set('Set-Cookie', cookie);

        return response;
    } catch (err) {
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }

}