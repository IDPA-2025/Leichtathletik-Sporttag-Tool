import { supabase } from "../../lib/supabaseClient";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const gruppe = searchParams.get("gruppe");

    if (!gruppe) {
        return new Response(JSON.stringify({ error: "Gruppe fehlt." }), { status: 400 });
    }

    const [klasse, geschlecht] = gruppe.split("-");

    const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("klasse", klasse)
        .eq("geschlecht", geschlecht);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
}
