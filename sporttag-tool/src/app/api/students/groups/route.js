import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const { data, error } = await supabase
        .from("students")
        .select("klasse, geschlecht");

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const groupMap = new Map();

    data.forEach(student => {
        const groupKey = `${student.klasse}-${student.geschlecht.toLowerCase()}`;
        if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
                id: groupKey,
                klasse: student.klasse,
                geschlecht: student.geschlecht.toLowerCase()
            });
        }
    });

    return new Response(JSON.stringify({ data: Array.from(groupMap.values()) }), { status: 200 });
}
