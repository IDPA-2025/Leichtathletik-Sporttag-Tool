import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function DELETE(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const { klasse } = await req.json();

    if (!klasse) {
        return new Response(JSON.stringify({ error: "Klasse fehlt" }), { status: 400 });
    }

    const { error } = await supabase.from("students").delete().eq("klasse", klasse);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
}
