import { supabase } from "../../lib/supabaseClient";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");

    if (!sport) {
        return new Response(JSON.stringify({ error: "Sportcode fehlt." }), { status: 400 });
    }

    const { data, error } = await supabase
        .from("sports")
        .select("attempts, mesure_unit_short, code, check_fail, time_measure, measure, name")
        .eq("code", sport)
        .single();

    if (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Fehler beim Laden der Sportart." }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}
