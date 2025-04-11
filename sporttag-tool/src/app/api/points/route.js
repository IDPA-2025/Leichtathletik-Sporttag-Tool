import { supabase } from "../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");
    const geschlecht = searchParams.get("geschlecht");
    const user = requireAnyRole(req, ["teacher", "assistant"]);


    if (!sport || !geschlecht) {
        return new Response(JSON.stringify({ error: "sport und geschlecht sind erforderlich." }), { status: 400 });
    }

    const { data, error } = await supabase
        .from("points_table")
        .select("leistung, punkte")
        .eq("sport_code", sport)
        .eq("geschlecht", geschlecht)
        .order("leistung", { ascending: false });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
}
