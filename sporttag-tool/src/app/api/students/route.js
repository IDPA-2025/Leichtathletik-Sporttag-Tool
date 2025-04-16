import { supabase } from "../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

// Schüler aus mehreren Gruppen (Klasse-Geschlecht) abrufen
export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const { searchParams } = new URL(req.url);
    const gruppenParam = searchParams.get("gruppen");

    // Gruppen-Parameter prüfen
    if (!gruppenParam) {
        return new Response(JSON.stringify({ error: "Gruppe fehlt." }), { status: 400 });
    }

    const gruppen = gruppenParam.split(",");

    // OR-Filter für Supabase generieren
    const orFilter = gruppen
        .map(g => {
            const [class_group, gender] = g.split("-");
            return `and(class_group.eq.${class_group},gender.eq.${gender})`;
        })
        .join(",");

    // Abfrage ausführen
    const { data, error } = await supabase
        .from("students")
        .select("*")
        .or(orFilter);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Ergebnis zurückgeben
    return new Response(JSON.stringify({ data }), { status: 200 });
}
