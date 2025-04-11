import { supabase } from "../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const { searchParams } = new URL(req.url);
    const gruppenParam = searchParams.get("gruppen");

    if (!gruppenParam) {
        return new Response(JSON.stringify({ error: "Gruppe fehlt." }), { status: 400 });
    }

    const gruppen = gruppenParam.split(",");

    const orFilter = gruppen
        .map(g => {
            const [klasse, geschlecht] = g.split("-");
            return `and(klasse.eq.${klasse},geschlecht.eq.${geschlecht})`;
        })
        .join(",");

    const { data, error } = await supabase
        .from("students")
        .select("*")
        .or(orFilter);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
}
