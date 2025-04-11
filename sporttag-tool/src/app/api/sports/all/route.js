import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    const { data, error } = await supabase
        .from("sports")
        .select("id, code, name, svg_url")
        .order("name", { ascending: true });

    if (error) {
        console.error("Fehler beim Laden der Sportarten:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
}
