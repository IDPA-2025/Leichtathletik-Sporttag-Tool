"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Loader2, CheckCircle } from "lucide-react";
import BackButton from "@/app/components/BackButton";

export default function GroupResults() {
    const { sport, group } = useParams();
    const groupKeys = group.split(","); // z.B. ["1a-maennlich", "2a-weiblich"]
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [attemptHeights, setAttemptHeights] = useState({});
    const [results, setResults] = useState({});
    const [scores, setScores] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showScale, setShowScale] = useState(false);
    const [pointsData, setPointsData] = useState([]);
    const [sportName, setSportName] = useState("");
    const [skippedStudents, setSkippedStudents] = useState({});
    const [sportConfig, setSportConfig] = useState({
        attempts: 4,
        unit: '',
        checkFails: false,
    });

    useEffect(() => {
        const fetchSportName = async () => {
            const { data, error } = await supabase
                .from("sports")
                .select("name")
                .eq("code", sport)
                .single();

            if (!error) setSportName(data.name);
        };

        fetchSportName();
    }, [sport]);

    const fetchStudents = async () => {
        try {
            const response = await fetch(`/api/students?gruppen=${groupKeys.join(",")}`);
            const json = await response.json();

            if (!response.ok) {
                console.error("Fehler beim Laden der Schüler:", json.error);
                return;
            }

            const data = json.data;
            const numAttempts = sportConfig.attempts || 3;

            setStudents(data);
            setFilteredStudents(data);

            const initialSkipped = {};
            const initialAttemptHeights = {};
            const initialResults = {};
            const initialScores = {};

            data.forEach(student => {
                initialSkipped[student.id] = false;
                initialAttemptHeights[student.id] = Array(numAttempts).fill("");
                initialResults[student.id] = Array(numAttempts).fill(null);
                initialScores[student.id] = Array(numAttempts).fill("");
            });

            setSkippedStudents(initialSkipped);
            setAttemptHeights(initialAttemptHeights);
            setResults(initialResults);
            setScores(initialScores);

            fetchExistingResults(data.map(s => s.id));
        } catch (err) {
            console.error("Fehler bei fetchStudents:", err);
        }
    };

    const fetchSportConfig = async () => {
        const { data, error } = await supabase
            .from("sports")
            .select("attempts, mesure_unit_short, code, check_fail, time_measure, measure")
            .eq("code", sport)
            .single();

        if (!error) {
            setSportConfig({
                code: data.code,
                attempts: data.attempts,
                unit: data.mesure_unit_short,
                checkFails: data.check_fail,
                time_measure: data.time_measure,
                measure: data.measure,
            });
        }
    };

    const fetchScale = async () => {
        const geschlechter = ["maennlich", "weiblich"]; // Immer beide

        const allData = [];

        for (const geschlecht of geschlechter) {
            const res = await fetch(`/api/points?sport=${sport}&geschlecht=${geschlecht}`);
            const json = await res.json();

            if (res.ok && json.data?.length > 0) {
                allData.push({ geschlecht, data: json.data });
            } else {
                console.error("Fehler beim Laden der Punkteskala für", geschlecht, ":", json.error);
            }
        }

        setPointsData(allData); // [{ geschlecht: ..., data: [...] }, ...]
    };



    const fetchExistingResults = async (studentIds) => {
        const { data, error } = await supabase
            .from("results")
            .select("*")
            .eq("sport", sport)
            .in("student_id", studentIds);

        if (!error && data.length > 0) {
            const numAttempts = sportConfig.attempts || 3;
            const loadedAttemptHeights = { ...attemptHeights };
            const loadedResults = { ...results };
            const loadedScores = { ...scores };

            data.forEach(result => {
                const processArray = (arr) =>
                    arr?.length < numAttempts
                        ? [...arr, ...Array(numAttempts - arr.length).fill("")]
                        : arr?.slice(0, numAttempts) || Array(numAttempts).fill("");

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
        const setter = type === "height" ? setAttemptHeights : setScores;

        setter(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }));
    };

    const handleResultChange = (studentId, index, value) => {
        setResults(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }));
    };

    const handleCheckboxChange = (studentId, checked) => {
        setSkippedStudents(prev => ({
            ...prev,
            [studentId]: checked,
        }));
    };

    const saveResults = async () => {
        setSaved(false);
        setIsSaving(true);

        try {
            const response = await fetch("/api/results", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    students,
                    sport,
                    group,
                    skippedStudents,
                    attemptHeights,
                    results,
                    scores,
                    sportConfig
                })
            });

            if (!response.ok) throw new Error("Fehler beim Speichern");

            setSaved(true);
        } catch (error) {
            console.error("Speicherfehler:", error);
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaved(false), 2500);
        }
    };

    const renderInputFields = (student, type) => {
        const numAttempts = sportConfig.attempts || 3;
        const values = type === "height"
            ? attemptHeights[student.id] || []
            : scores[student.id] || [];

        return Array.from({ length: numAttempts }, (_, index) => (
            <div key={index} className="flex items-center gap-2">
                <span className="font-semibold">{index + 1}.</span>
                <input
                    type="number"
                    step="0.01"
                    className="w-20 p-2 text-center border border-gray-300 rounded-lg"
                    value={values[index] || ""}
                    onChange={(e) => handleInputChange(student.id, index, e.target.value, type)}
                    disabled={!!skippedStudents[student.id]}
                />
                {sportConfig.unit}
                {type === "height" && (
                    <>
                        <button
                            className={`p-2 rounded-lg ${results[student.id][index] === true ? 'bg-green-400' : 'bg-gray-200'}`}
                            onClick={() => handleResultChange(student.id, index, true)}
                        >✔</button>
                        <button
                            className={`p-2 rounded-lg ${results[student.id][index] === false ? 'bg-red-400' : 'bg-gray-200'}`}
                            onClick={() => handleResultChange(student.id, index, false)}
                        >✘</button>
                    </>
                )}
            </div>
        ));
    };

    useEffect(() => {
        fetchSportConfig();
    }, [sport]);

    useEffect(() => {
        if (sportConfig.attempts) fetchStudents();
    }, [sportConfig]);

    useEffect(() => {
        if (showScale) fetchScale();
    }, [showScale]);

    useEffect(() => {
        const result = students.filter(student => {
            const present = student.anwesend === true;
            const notHelper = !student.helfer;
            const matches = !searchQuery || `${student.vorname} ${student.nachname}`.toLowerCase().includes(searchQuery.toLowerCase());
            return present && notHelper && matches;
        });
        setFilteredStudents(result);
    }, [searchQuery, students]);

    return (
        <div className="wrapper-container p-4">
            <div className="transparent-container mb-15">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">
                    Ergebnisse für {sportName || sport}
                </h1>

                <input
                    type="text"
                    placeholder="🔍 Schüler suchen..."
                    className="mb-4 w-full p-3 border border-gray-300 rounded-lg text-gray-900 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <button
                    className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-800"
                    onClick={() => setShowScale(true)}
                >
                    📋 Punkteskala anzeigen
                </button>

                <div className="flex-grow overflow-y-auto flex flex-col gap-4">
                    {filteredStudents.map((student, index) => (
                        <div
                            key={student.id}
                            className={`bg-white shadow-md p-4 rounded-xl border border-gray-300 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between
                            ${skippedStudents[student.id] ? "opacity-50 line-through" : ""}`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mb-2">
                                <label className="flex items-center gap-2 text-sm text-gray-500">
                                    <input
                                        type="checkbox"
                                        checked={!!skippedStudents[student.id]}
                                        onChange={(e) => handleCheckboxChange(student.id, e.target.checked)}
                                        className="accent-red-500 scale-110"
                                    />
                                    <span>Nicht teilgenommen</span>
                                </label>
                                <p className="text-lg font-semibold text-gray-900">
                                    {student.vorname} {student.nachname}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-4 justify-center text-gray-900">
                                {sportConfig.checkFails === true
                                    ? renderInputFields(student, "height")
                                    : renderInputFields(student, "score")}
                            </div>
                        </div>
                    ))}
                </div>

                {students.length > 0 && (
                    <div className="mt-6 flex flex-col items-center">
                        <button
                            className={`py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2
                            ${isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                            onClick={saveResults}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
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
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50"
                    onClick={(e) => {
                        // Wenn man auf den Hintergrund klickt, schliessen
                        if (e.target === e.currentTarget) setShowScale(false);
                    }}
                >
                    <div className="bg-white w-full max-w-2xl mx-6 p-6 rounded-xl shadow-lg border border-gray-200 overflow-y-auto max-h-[70vh] animate-fade-in">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                            Punkteskalen – {sportName || sport}
                        </h2>

                        {pointsData.length === 0 && (
                            <div className="text-center p-4 text-gray-600 rounded-md border border-dashed border-gray-300 bg-gray-50">
                                Keine Punkteskala gefunden.
                            </div>
                        )}

                        {/* Desktop Grid | Mobile Accordion */}
                        <div className="hidden md:grid grid-cols-2 gap-6">
                            {pointsData.map(({ geschlecht, data }) => (
                                <div key={geschlecht} className="rounded-md border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50 py-2 px-4 border-b border-gray-200">
                                        <h3 className="text-md font-semibold text-gray-800 text-center">
                                            {geschlecht === "maennlich" ? "♂ Männlich" : "♀ Weiblich"}
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm text-left text-gray-700">
                                            <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Leistung</th>
                                                <th className="px-4 py-3 font-medium text-right">Punkte</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                            {data.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2">{row.leistung}</td>
                                                    <td className="px-4 py-2 text-right">{row.punkte}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                            {pointsData.length === 1 && <div />}
                        </div>

                        {/* Mobile Accordion */}
                        <div className="block md:hidden space-y-4 text-gray-800">
                            {pointsData.map(({ geschlecht, data }) => (
                                <details key={geschlecht} className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
                                    <summary className="bg-gray-100 py-2 px-4 font-semibold cursor-pointer select-none">
                                        {geschlecht === "maennlich" ? "♂ Männlich" : "♀ Weiblich"}
                                    </summary>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-700 divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-2">Leistung</th>
                                                <th className="px-4 py-2 text-right">Punkte</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white">
                                            {data.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2">{row.leistung}</td>
                                                    <td className="px-4 py-2 text-right">{row.punkte}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            ))}
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                className="button"
                                onClick={() => setShowScale(false)}
                            >
                                Verstanden
                            </button>
                        </div>
                    </div>

                    <style jsx>{`
      .animate-fade-in {
        animation: fadein 0.3s ease-out forwards;
      }

      @keyframes fadein {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>
                </div>
            )}





            <BackButton />
        </div>
    );
}
