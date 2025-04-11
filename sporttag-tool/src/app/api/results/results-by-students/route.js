import { supabase } from "../../../lib/supabaseClient";

export async function POST(req) {
    const body = await req.json();
    const { studentIds, sport } = body;

    if (!studentIds || !Array.isArray(studentIds) || !sport) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter." }), { status: 400 });
    }

    const { data, error } = await supabase
        .from("results")
        .select("*")
        .eq("sport", sport)
        .in("student_id", studentIds);

    if (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Fehler beim Abrufen der Ergebnisse." }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}
