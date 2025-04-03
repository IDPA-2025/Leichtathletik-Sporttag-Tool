import { supabase } from "../../lib/supabaseClient";

function getBestResult(scoresRaw, heightsRaw, resultsRaw, config) {
    const scores = Array.isArray(scoresRaw) ? scoresRaw : [];
    const heights = Array.isArray(heightsRaw) ? heightsRaw : [];
    const results = Array.isArray(resultsRaw) ? resultsRaw : [];

    if (config.time_measure === false && config.checkFails === true) {
        const heightResults = heights.map((val, i) =>
            results[i] === true ? parseFloat(val) || 0 : 0
        );
        return Math.max(...heightResults);
    }

    if (config.time_measure === true) {
        const numeric = scores.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
        return numeric.length > 0 ? Math.min(...numeric) : 0;
    }

    const numeric = scores.map(v => parseFloat(v)).filter(v => !isNaN(v));
    return numeric.length > 0 ? Math.max(...numeric) : 0;
}

export async function POST(req) {
    const body = await req.json();
    const { students, sport, group, skippedStudents, attemptHeights, results, scores, sportConfig } = body;

    try {
        for (const student of students) {
            const isSkipped = !!skippedStudents[student.id];
            const bestResult = getBestResult(scores[student.id], attemptHeights[student.id], results[student.id], sportConfig);
            const geschlecht = group.split("-")[1];
            const sportCode = sport;

            let pointData;

            if (sportConfig.time_measure === true) {
                const response = await supabase
                    .from("points_table")
                    .select("punkte")
                    .eq("geschlecht", geschlecht)
                    .eq("sport_code", sportCode)
                    .gte("leistung", bestResult)
                    .order("leistung", { ascending: true })
                    .limit(1);

                pointData = response.data;

                if (!pointData || pointData.length === 0) {
                    const fallbackResponse = await supabase
                        .from("points_table")
                        .select("punkte")
                        .eq("geschlecht", geschlecht)
                        .eq("sport_code", sportCode)
                        .gt("leistung", bestResult)
                        .order("leistung", { ascending: true })
                        .limit(1);
                    pointData = fallbackResponse.data;
                }
            } else {
                const response = await supabase
                    .from("points_table")
                    .select("punkte")
                    .eq("geschlecht", geschlecht)
                    .eq("sport_code", sportCode)
                    .lte("leistung", bestResult)
                    .order("leistung", { ascending: false })
                    .limit(1);

                pointData = response.data;

                if (!pointData || pointData.length === 0) {
                    const fallbackResponse = await supabase
                        .from("points_table")
                        .select("punkte")
                        .eq("geschlecht", geschlecht)
                        .eq("sport_code", sportCode)
                        .lt("leistung", bestResult)
                        .order("leistung", { ascending: false })
                        .limit(1);
                    pointData = fallbackResponse.data;
                }
            }

            if (bestResult === 0) {
                pointData = [{ punkte: null }];
            }

            const punkte = pointData && pointData.length > 0 ? pointData[0].punkte : null;

            const update = {
                student_id: student.id,
                sport: sport,
                group: group,
                heights: sportConfig.checkFails ? attemptHeights[student.id] : null,
                attempt_results: sportConfig.checkFails ? results[student.id] : null,
                scores: !sportConfig.checkFails ? scores[student.id] : null,
                best_result: isSkipped ? null : bestResult,
                points: isSkipped ? null : punkte,
                skipped: isSkipped,
            };

            const { data: existingData } = await supabase
                .from("results")
                .select("*")
                .eq("student_id", update.student_id)
                .eq("sport", sport)
                .maybeSingle();

            if (existingData) {
                const { error } = await supabase
                    .from("results")
                    .update(update)
                    .eq("id", existingData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("results").insert(update);
                if (error) throw error;
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Fehler beim Speichern." }), { status: 500 });
    }
}