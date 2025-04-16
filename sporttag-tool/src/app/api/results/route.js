import { supabase } from "../../lib/supabaseClient";
import { requireAnyRole } from "@/app/lib/auth";

// Bestleistung je nach Konfiguration berechnen
function getBestResult(scoresRaw, heightsRaw, resultsRaw, config) {
    const scores = Array.isArray(scoresRaw) ? scoresRaw : [];
    const heights = Array.isArray(heightsRaw) ? heightsRaw : [];
    const results = Array.isArray(resultsRaw) ? resultsRaw : [];

    // z.B. Hochsprung (Versuchslogik)
    if (config.time_measure === false && config.checkFails === true) {
        const heightResults = heights.map((val, i) =>
            results[i] === true ? parseFloat(val) || 0 : 0
        );
        return Math.max(...heightResults);
    }

    // z.B. Sprint (Zeitmessung)
    if (config.time_measure === true) {
        const numeric = scores.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
        return numeric.length > 0 ? Math.min(...numeric) : 0;
    }

    // z.B. Weitsprung, Kugelstossen (Weite)
    const numeric = scores.map(v => parseFloat(v)).filter(v => !isNaN(v));
    return numeric.length > 0 ? Math.max(...numeric) : 0;
}

// Punktwert aus Punktetabelle abrufen
async function fetchPointData({ gender, sportCode, bestResult, timeMeasure }) {
    console.log(`[fetchPointData] Suche Punktzahl für ${gender}, ${sportCode}, Ergebnis: ${bestResult}`);

    const response = await supabase
        .from("points_table")
        .select("performance, punkte")
        .eq("gender", gender)
        .eq("sport_code", sportCode)
        .order("performance", { ascending: timeMeasure });

    if (response.error) {
        console.error("[fetchPointData] Fehler:", response.error);
        throw response.error;
    }

    // passenden Eintrag filtern
    const sorted = response.data.filter(row =>
        timeMeasure ? row.performance >= bestResult : row.performance <= bestResult
    );

    console.log("[fetchPointData] Gefundene Punktdaten:", sorted[0]);
    return sorted.length > 0 ? [sorted[0]] : [];
}

// Ergebnisse speichern
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    console.log("🔐 Zugriff durch:", user);

    const body = await req.json();
    const { students, sport, group, skippedStudents, attemptHeights, results, scores, sportConfig } = body;

    try {
        // Schülerinfos abrufen
        const { data: studentInfos, error: studentFetchError } = await supabase
            .from("students")
            .select("id, gender, age_category, class_group")
            .in("id", students.map(s => s.id));

        if (studentFetchError) throw studentFetchError;

        for (const student of students) {
            const studentInfo = studentInfos.find(s => s.id === student.id);
            if (!studentInfo) {
                console.warn(`❌ Kein Profil gefunden für ID ${student.id}`);
                continue;
            }

            const isSkipped = !!skippedStudents[student.id];
            const bestResult = getBestResult(scores[student.id], attemptHeights[student.id], results[student.id], sportConfig);
            console.log(`👟 [${student.id}] Bestleistung:`, bestResult);

            // Punkte bestimmen (oder null)
            let pointData = bestResult === 0
                ? [{ punkte: null }]
                : await fetchPointData({
                    gender: studentInfo.gender,
                    sportCode: sport,
                    bestResult,
                    timeMeasure: sportConfig.time_measure
                });

            const points = pointData.length > 0 ? pointData[0].punkte : 0;

            // Note berechnen
            let note = null;
            if (!isSkipped && points !== null) {
                const { data: gradeData, error: gradeError } = await supabase
                    .from("grades_table")
                    .select("grade")
                    .eq("gender", studentInfo.gender)
                    .eq("age_category", studentInfo.age_category)
                    .lte("average_points_per_category", points)
                    .order("average_points_per_category", { ascending: false })
                    .limit(1);

                if (gradeError) throw gradeError;
                note = gradeData[0]?.grade ?? 1;
                console.log(`📝 [${student.id}] Note:`, note);
            }

            // Eintrag vorbereiten
            const update = {
                student_id: student.id,
                sport,
                group: `${studentInfo.class_group}-${studentInfo.gender}`,
                heights: sportConfig.checkFails ? attemptHeights[student.id] : null,
                attempt_results: sportConfig.checkFails ? results[student.id] : null,
                scores: !sportConfig.checkFails ? scores[student.id] : null,
                best_result: isSkipped ? null : bestResult,
                points: isSkipped ? null : points,
                skipped: isSkipped,
                grade: isSkipped ? null : note
            };

            console.log("💾 Speichere Resultat für", student.id, update);

            // Prüfen ob Resultat existiert
            const { data: existingData, error: fetchError } = await supabase
                .from("results")
                .select("id")
                .eq("student_id", student.id)
                .eq("sport", sport)
                .maybeSingle();

            if (fetchError) throw fetchError;

            // Update oder Insert
            const { error: upsertError } = existingData
                ? await supabase.from("results").update(update).eq("id", existingData.id)
                : await supabase.from("results").insert(update);

            if (upsertError) {
                console.error(`❌ Fehler beim Speichern von ${student.id}:`, upsertError);
                throw upsertError;
            }

            console.log(`✅ [${student.id}] Ergebnis gespeichert`);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (e) {
        console.error("🚨 Fehler beim Speichern der Resultate:", e);
        return new Response(JSON.stringify({ error: "Fehler beim Speichern." }), { status: 500 });
    }
}
