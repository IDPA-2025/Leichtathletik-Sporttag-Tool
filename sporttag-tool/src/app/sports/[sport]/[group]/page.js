"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Loader2, CheckCircle } from "lucide-react"; // Icon oben im File importieren


export default function GroupResults() {
    const { sport, group } = useParams();
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [attemptHeights, setAttemptHeights] = useState({});
    const [results, setResults] = useState({});
    const [scores, setScores] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [showScale, setShowScale] = useState(false);
    const [pointsData, setPointsData] = useState([]);
    const [sportName, setSportName] = useState("");
    const [showExport, setShowExport] = useState(false);
    const [skippedStudents, setSkippedStudents] = useState({});
    const [saved, setSaved] = useState(false); // NEU
    const [sportConfig, setSportConfig] = useState({
        attempts: 3,
        unit: '',
        checkFails: false,
    });

    const fetchScale = async () => {
        const geschlecht = group.split("-")[1];

        const { data, error } = await supabase
            .from("points_table")
            .select("leistung, punkte")
            .eq("sport_code", sport)
            .eq("geschlecht", geschlecht)
            .order("leistung", { ascending: false });

        if (!error) setPointsData(data);
    };

    const fetchStudents = async () => {
        const [className, geschlecht] = group.split("-");

        const { data, error } = await supabase
            .from("students")
            .select("id, vorname, nachname")
            .eq("klasse", className)
            .eq("geschlecht", geschlecht);

        if (error) {
            console.error("Fehler beim Laden der Schüler:", error);
            return;
        }

        const numAttempts = sportConfig.attempts || 3;
        setStudents(data);             // ALLE Schüler setzen, inkl. skipped = true
        setFilteredStudents(data);    // Auch die Suche arbeitet mit allen
        const initialSkipped = {};
        data.forEach(student => {
            initialSkipped[student.id] = student.skipped || false;
        });
        setSkippedStudents(initialSkipped);

        const initialAttemptHeights = {};
        const initialResults = {};
        const initialScores = {};
        data.forEach(student => {
            initialAttemptHeights[student.id] = Array(numAttempts).fill("");
            initialResults[student.id] = Array(numAttempts).fill(null);
            initialScores[student.id] = Array(numAttempts).fill("");
        });

        setAttemptHeights(initialAttemptHeights);
        setResults(initialResults);
        setScores(initialScores);

        fetchExistingResults(data.map(s => s.id));
    };

    const fetchSportConfig = async () => {
        const { data, error } = await supabase
            .from("sports")
            .select("attempts, mesure_unit_short, code, check_fail, time_measure, measure")
            .eq("code", sport)
            .single();

        if (error) {
            console.error("Fehler beim Laden der Sportkonfiguration:", error);
            return;
        }

        setSportConfig({
            code: data.code,
            attempts: data.attempts,
            unit: data.mesure_unit_short,
            checkFails: data.check_fail,
            time_measure: data.time_measure,
            measure: data.measure,
        });
    }

    const fetchExistingResults = async (studentIds) => {
        const { data, error } = await supabase
            .from("results")
            .select("*")
            .eq("sport", sport)
            .in("student_id", studentIds);

        if (error) {
            console.error("Fehler beim Laden der Ergebnisse:", error);
            return;
        }

        if (data && data.length > 0) {
            const numAttempts = sportConfig.attempts || 3;
            const loadedAttemptHeights = {...attemptHeights};
            const loadedResults = {...results};
            const loadedScores = {...scores};

            data.forEach(result => {
                const processArray = (originalArray) => {
                    if (!originalArray) return Array(numAttempts).fill("");
                    return originalArray.length < numAttempts
                        ? [...originalArray, ...Array(numAttempts - originalArray.length).fill("")]
                        : originalArray.slice(0, numAttempts);
                };

                if (result.heights) loadedAttemptHeights[result.student_id] = processArray(result.heights);
                if (result.attempt_results) loadedResults[result.student_id] = processArray(result.attempt_results);
                if (result.scores) loadedScores[result.student_id] = processArray(result.scores);
            });

            setAttemptHeights(loadedAttemptHeights);
            setResults(loadedResults);
            setScores(loadedScores);

            const loadedSkipped = { ...skippedStudents };
            data.forEach(result => {
                if (result.skipped !== undefined && result.student_id) {
                    loadedSkipped[result.student_id] = result.skipped;
                }
            });
            setSkippedStudents(loadedSkipped);
        }
    };

    const handleInputChange = (studentId, index, value, type) => {
        if (type === "height") {
            setAttemptHeights(prev => ({
                ...prev,
                [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
            }));
        } else if (type === "score") {
            setScores(prev => ({
                ...prev,
                [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
            }));
        }
    };

    const handleResultChange = (studentId, index, value) => {
        setResults(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }));
    };

    const getBestResult = (studentId) => {
        if (!scores[studentId] || !Array.isArray(scores[studentId])) return 0;
        if (!results[studentId] || !Array.isArray(results[studentId])) return 0;
        if (!attemptHeights[studentId] || !Array.isArray(attemptHeights[studentId])) return 0;

        if (sportConfig.time_measure === false) {
            const heightResults = attemptHeights[studentId].map((height, index) =>
                results[studentId][index] === true ? parseFloat(height) || 0 : 0
            );
            return Math.max(...heightResults);
        } else if (sportConfig.checkFails === true)  {
            const numericScores = scores[studentId].map(score => parseFloat(score) || 0);
            return Math.min(...numericScores.filter(score => score > 0)) || 0;
        } else {
            const numericScores = scores[studentId].map(score => parseFloat(score) || 0);
            return Math.max(...numericScores) || 0;
        }
    };

    const saveResults = async () => {
        setSaved(false);
        setIsSaving(true);

        try {

            for (const student of students) {
                const isSkipped = !!skippedStudents[student.id];
                const bestResult = getBestResult(student.id);
                const geschlecht = group.split("-")[1];
                const sportCode = sport;


                let pointData;

                // Zeitdisziplin: kleinere Zeit besser (z.B. 12.34s)
                if (sportConfig.time_measure === false) {
                    const response = await supabase
                        .from("points_table")
                        .select("punkte")
                        .eq("geschlecht", geschlecht)
                        .eq("sport_code", sportCode)
                        .gte("leistung", bestResult) // 👈 langsamer oder gleich
                        .order("leistung", { ascending: false }) // nächstgrößerer Zeitwert zuerst
                        .limit(1);
                    pointData = response.data;
                } else {
                    // Wurf/Sprung: größere Leistung besser (z.B. 6.20m)
                    const response = await supabase
                        .from("points_table")
                        .select("punkte")
                        .eq("geschlecht", geschlecht)
                        .eq("sport_code", sportCode)
                        .gte("leistung", bestResult)
                        .order("leistung", { ascending: true }) // niedrigste Leistung ≥ best_result
                        .limit(1);
                    pointData = response.data;
                }

                const punkte = pointData && pointData.length > 0 ? pointData[0].punkte : null;

                const update = {
                    student_id: student.id,
                    sport: sport,
                    group: group,
                    // heights: sport.toLowerCase() === "hoch" ? attemptHeights[student.id] : null,
                    heights: sportConfig.checkFails === true ? attemptHeights[student.id] : null,
                    attempt_results: sportConfig.checkFails === true ? results[student.id] : null,
                    scores: sportConfig.checkFails === true ? scores[student.id] : null,
                    best_result: isSkipped ? null : bestResult,
                    points: isSkipped ? null : punkte,
                    skipped: isSkipped,
                };

                // Insert oder Update
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

            setSaved(true);

        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            setSaveMessage("Fehler beim Speichern der Ergebnisse.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaved(false), 2500); // Icon nach 2.5s wieder weg
        }
    };

    useEffect(() => {
        if (showScale) fetchScale();
    }, [showScale, sport, group]);

    useEffect(() => {
        fetchStudents();
    }, [group, sport]);

    useEffect(() => {
        fetchSportConfig();
    }, [sport]);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredStudents(students);
        } else {
            setFilteredStudents(
                students.filter(student =>
                    `${student.vorname} ${student.nachname}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, students]);






    return (
        <div className="wrapper-container p-4">
            <div className="transparent-container mb-15">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">
                    Ergebnisse für {sportName || sport}
                </h1>

                <button
                    className="absolute top-0 left-0 mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-800"
                    onClick={() => setShowScale(true)}
                >
                    📋 Punkteskala anzeigen
                </button>

                <input
                    type="text"
                    placeholder="🔍 Schüler suchen..."
                    className="mb-4 w-full p-3 border border-gray-300 rounded-lg text-gray-900 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="flex-grow overflow-y-auto flex flex-col gap-4">
                    {filteredStudents.map(student => (
                        <div
                            key={student.id}
                            className={`bg-white shadow-md p-4 rounded-xl border border-gray-300 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between transition-all duration-300 ease-in-out ${
                                skippedStudents[student.id] ? 'opacity-50 line-through' : ''
                            }`}
                        >

                            <div
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-start gap-2 sm:gap-6 mb-2 transition-all duration-300 ease-in-out"
                            >
                                <p className="text-lg font-semibold text-gray-900 whitespace-nowrap transition-all duration-300">
                                    {student.vorname} {student.nachname}
                                </p>

                                <label
                                    className="flex items-center gap-2 text-sm text-gray-500 transition-all duration-300 ease-in-out">
                                    <input
                                        type="checkbox"
                                        checked={!!skippedStudents[student.id]}
                                        onChange={(e) =>
                                            setSkippedStudents((prev) => ({
                                                ...prev,
                                                [student.id]: e.target.checked,
                                            }))
                                        }
                                        className="accent-red-500 scale-110 transition-all duration-300"
                                    />
                                    <span className="hidden sm:inline">Nicht teilgenommen</span>
                                </label>
                            </div>


                            <div className="flex flex-wrap gap-4 justify-center text-gray-900">
                                {sportConfig.checkFails === true ? (
                                    attemptHeights[student.id]?.map((height, i) => (
                                        <div key={i} className="flex items-center gap-2 rounded-lg overflow-hidden p-2">
                                            <span className="font-semibold">{i + 1}.</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-20 p-2 text-center border border-gray-300 rounded-lg"
                                                value={height || ""}
                                                onChange={(e) => handleInputChange(student.id, i, e.target.value, "height")}
                                                placeholder={sportConfig.measure}
                                                disabled={!!skippedStudents[student.id]}
                                                title={skippedStudents[student.id] ? "Nicht teilgenommen" : ""}
                                            />
                                            <button
                                                className={`p-2 rounded-lg ${results[student.id][i] === true ? 'bg-green-400' : 'bg-gray-200'}`}
                                                onClick={() => handleResultChange(student.id, i, true)}
                                                disabled={!!skippedStudents[student.id]}
                                            >✔
                                            </button>
                                            <button
                                                className={`p-2 rounded-lg ${results[student.id][i] === false ? 'bg-red-400' : 'bg-gray-200'}`}
                                                onClick={() => handleResultChange(student.id, i, false)}
                                                disabled={!!skippedStudents[student.id]}
                                            >✘
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    scores[student.id]?.map((score, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="font-semibold">{i + 1}.</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-20 p-2 text-center border border-gray-300 rounded-lg"
                                                value={score || ""}
                                                onChange={(e) => handleInputChange(student.id, i, e.target.value, "score")}
                                                placeholder={sportConfig.measure}
                                                disabled={!!skippedStudents[student.id]}
                                                title={skippedStudents[student.id] ? "Nicht teilgenommen" : ""}
                                            />
                                            <span className="text-sm text-gray-500">{sportConfig.unit}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {students.length > 0 && (
                    <div className="mt-6 flex flex-col items-center">
                        <button
                            className={`py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2
        ${isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}
        text-white transition duration-200`}
                            onClick={saveResults}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin" size={18}/>
                                    Speichern...
                                </>
                            ) : saved ? (
                                <>
                                    <CheckCircle size={18} />
                                    Gespeichert!
                                </>
                            ) : (
                                'Ergebnisse speichern'
                            )}
                        </button>
                    </div>
                )}

            </div>

            {showScale && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/10 z-50">
                    <div className="bg-white w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl border border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Punkteskala – {sport}
                        </h2>

                        <div className="max-h-64 overflow-y-auto rounded border border-gray-200">
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 font-semibold">Leistung</th>
                                    <th className="px-4 py-2 font-semibold">Punkte</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pointsData.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">{row.leistung}</td>
                                        <td className="px-4 py-2">{row.punkte}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 text-right">
                            <button
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                                onClick={() => setShowScale(false)}
                            >
                                Schliessen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}