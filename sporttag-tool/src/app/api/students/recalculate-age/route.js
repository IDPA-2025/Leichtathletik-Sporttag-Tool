// File: /app/api/students/recalculate-age/route.js
import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

function calculateAgeCategory(geburtsdatum, veranstaltungsDatumStr) {
    const veranstaltungsDatum = new Date(veranstaltungsDatumStr);
    const geburtsdatumDate = new Date(geburtsdatum);
    const diffInJahren = veranstaltungsDatum.getFullYear() - geburtsdatumDate.getFullYear();
    const adjust = veranstaltungsDatum < new Date(geburtsdatumDate.setFullYear(veranstaltungsDatum.getFullYear()));
    const alter = adjust ? diffInJahren - 1 : diffInJahren;

    if (alter < 16) return "-15";
    if (alter >= 16 && alter <= 17) return "16-17";
    return "18+";
}

export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    try {
        const { data: sportdayData, error: dateError } = await supabase
            .from("sportdays")
            .select("date")
            .single();

        if (dateError || !sportdayData?.date) {
            console.error("Fehler beim Laden des Sporttag-Datums:", dateError);
            return new Response(JSON.stringify({ error: "Veranstaltungsdatum konnte nicht geladen werden." }), { status: 500 });
        }

        const veranstaltungsDatum = sportdayData.date;

        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("id, geburtsdatum");

        if (studentError) {
            console.error("Fehler beim Laden der Schülerdaten:", studentError);
            return new Response(JSON.stringify({ error: studentError.message }), { status: 500 });
        }

        const updates = students.map((student) => ({
            id: student.id,
            age_category: calculateAgeCategory(student.geburtsdatum, veranstaltungsDatum),
        }));

        // Performanter: ein einziger Aufruf mit upsert()
        for (const update of updates) {
            const { error: updateError } = await supabase
                .from("students")
                .update({ age_category: update.age_category })
                .eq("id", update.id);

            if (updateError) {
                console.error(`Fehler beim Aktualisieren von ID ${update.id}:`, updateError);
                return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
            }
        }


        return new Response(JSON.stringify({ success: true, updated: updates.length }), { status: 200 });
    } catch (err) {
        console.error("Unerwarteter Fehler in recalculate-age:", err);
        return new Response(JSON.stringify({ error: "Interner Fehler" }), { status: 500 });
    }
}
