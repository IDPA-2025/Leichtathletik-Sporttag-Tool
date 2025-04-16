import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

// POST-Handler: Ergebnisse für bestimmte Schüler und Sportart abrufen
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    const body = await req.json();
    const { studentIds, sport } = body;

    // Parameter prüfen
    if (!studentIds || !Array.isArray(studentIds) || !sport) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter." }), { status: 400 });
    }

    // Resultate aus Supabase laden
    const { data, error } = await supabase
        .from("results")
        .select("*")
        .eq("sport", sport)
        .in("student_id", studentIds);

    if (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Fehler beim Abrufen der Ergebnisse." }), { status: 500 });
    }

    // Ergebnisse zurückgeben
    return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}
