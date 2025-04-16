import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    try {
        const students = await req.json();

        if (!Array.isArray(students)) {
            return new Response(JSON.stringify({ error: "Ungültiges Format: students muss ein Array sein." }), { status: 400 });
        }

        const { error } = await supabase
            .from("students")
            .upsert(students, { onConflict: ["id"] });



        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const newClasses = [...new Set(students.map(s => s.class_group))];
        return new Response(JSON.stringify({ success: true, newClasses }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}