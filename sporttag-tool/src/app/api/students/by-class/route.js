import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

// Schüler einer bestimmten Klasse abrufen
export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const { searchParams } = new URL(req.url);
    const klasse = searchParams.get("klasse");

    // Klasse prüfen
    if (!klasse) {
        return new Response(JSON.stringify({ error: "Klasse fehlt" }), { status: 400 });
    }

    // Schüler aus Supabase laden
    const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("klasse", klasse);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Schülerliste zurückgeben
    return new Response(JSON.stringify({ data }), { status: 200 });
}
