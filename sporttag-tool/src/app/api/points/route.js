import { supabase } from "../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

// GET-Handler: Punktetabelle für Sportart + Geschlecht abrufen
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");
    const gender = searchParams.get("gender");
    // Nur Lehrer oder Assistenten dürfen zugreifen
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    // Fehlende Parameter → Bad Request
    if (!sport || !gender) {
        return new Response(JSON.stringify({ error: "sport und gender sind erforderlich." }), { status: 400 });
    }

    // Punktetabelle aus Supabase abfragen
    const { data, error } = await supabase
        .from("points_table")
        .select("leistung, punkte")
        .eq("sport_code", sport)
        .eq("gender", gender)
        .order("leistung", { ascending: false });

    // Fehler bei der Abfrage → Internal Server Error
    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Erfolgreich: Punktetabelle zurückgeben
    return new Response(JSON.stringify({ data }), { status: 200 });
}
