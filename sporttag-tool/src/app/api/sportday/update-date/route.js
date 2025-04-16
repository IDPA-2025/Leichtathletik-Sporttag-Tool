import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

// Sporttag-Datum setzen (oder aktualisieren)
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher"]);

    const body = await req.json();
    const { date } = body;

    // Datum prüfen
    if (!date) {
        return new Response(JSON.stringify({ error: "Kein Datum übergeben." }), { status: 400 });
    }

    // Eintrag mit id: 1 upserten
    const { error } = await supabase
        .from("sportdays")
        .upsert({ id: 1, date });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Erfolgsmeldung zurückgeben
    return new Response(JSON.stringify({ success: true, date }), { status: 200 });
}
