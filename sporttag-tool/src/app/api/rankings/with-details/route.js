import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher"]);

    try {
        // Schülerdaten abrufen
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("id, vorname, nachname, klasse, geburtsdatum, gender, age_category, grade, anwesend, total_points, helfer")

        if (studentError) {
            throw new Error("Fehler beim Laden der Schüler: " + studentError.message);
        }

        // Resultate abrufen (z.B. für Punkte & Detailanzeige)
        const { data: results, error: resultsError } = await supabase
            .from("results")
            .select("student_id, sport, best_result, skipped, points, grade");

        if (resultsError) {
            throw new Error("Fehler beim Laden der Resultate: " + resultsError.message);
        }

        // Sportarten (für Namen & Einheiten im Export)
        const { data: sports, error: sportsError } = await supabase
            .from("sports")
            .select("code, name, mesure_unit_short");

        if (sportsError) {
            throw new Error("Fehler beim Laden der Sportarten: " + sportsError.message);
        }

        // Punkte pro Schüler berechnen (nur wenn skipped = false)
        const punkteMap = new Map();
        for (const r of results) {
            if (!r.student_id || r.points == null || r.skipped === true) continue;
            punkteMap.set(r.student_id, (punkteMap.get(r.student_id) || 0) + r.points);
        }

        // Punkte in DB zurückschreiben (optional, falls noch nicht gespeichert)
        for (const [studentId, punkte] of punkteMap.entries()) {
            await supabase
                .from("students")
                .update({ total_points: punkte })
                .eq("id", studentId);
        }

        // Daten in ein einheitliches Format bringen
        const daten = students.map((s) => ({
            id: s.id,
            vorname: s.vorname,
            nachname: s.nachname,
            klasse: s.klasse,
            gender: s.gender,
            alter: s.alter,
            kategorie: s.age_category,
            total_points: s.total_points || 0,
            grade: s.grade,
            helfer: s.helfer,
            anwesend: s.anwesend
        }));

        // Rankings nach Alterskategorie & Klasse gruppieren
        const gruppierteRanglisten = {};

        for (const eintrag of daten) {
            // Preset1 → Gruppierung nach Alterskategorie + Geschlecht
            const keyCategory = `category__${eintrag.kategorie}__${eintrag.gender}`;
            if (!gruppierteRanglisten[keyCategory]) {
                gruppierteRanglisten[keyCategory] = [];
            }
            gruppierteRanglisten[keyCategory].push(eintrag);

            // Preset2 → Gruppierung nach Klasse + Geschlecht
            const keyClass = `class__${eintrag.klasse}__${eintrag.gender}`;
            if (!gruppierteRanglisten[keyClass]) {
                gruppierteRanglisten[keyClass] = [];
            }
            gruppierteRanglisten[keyClass].push(eintrag);
        }

        // Innerhalb jeder Gruppe nach Punkten sortieren (absteigend)
        for (const key in gruppierteRanglisten) {
            gruppierteRanglisten[key].sort((a, b) => b.total_points - a.total_points);
        }

        // Response: Rankings + alle benötigten Zusatzdaten
        return new Response(JSON.stringify({
            rankings: gruppierteRanglisten,
            results,
            sports,
            students: daten
        }), { status: 200 });

    } catch (error) {
        console.error("Fehler in /api/rankings/with-details:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}