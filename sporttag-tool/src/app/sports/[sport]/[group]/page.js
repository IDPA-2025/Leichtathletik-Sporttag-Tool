"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function GroupResults() {
    const { sport, group } = useParams();
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [scores, setScores] = useState({});
    const [absentees, setAbsentees] = useState([]);

    // Funktion zur Bestimmung der Einheit basierend auf der Sportart
    const getUnit = () => {
        const sportUnits = {
            sprint: "sekunden",
            "80m": "sekunden",
            hochsprung: "meter",
            weitsprung: "meter",
            kugelstossen: "meter",
            speerwurf: "meter",
            huerdenlauf: "sekunden",
            punkte: "Punkte",
        };
        return sportUnits[sport.toLowerCase()] || "";
    };

    useEffect(() => {
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

            setStudents(data);
            setFilteredStudents(data);

            const initialScores = {};
            data.forEach(student => {
                initialScores[student.id] = ["", "", ""];
            });
            setScores(initialScores);
        };

        fetchStudents();
    }, [group]);

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

    const handleScoreChange = (studentId, index, value) => {
        setScores(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }));
    };

    return (
        <div className="wrapper-container">
            <div className="transparent-container flex flex-col h-[90dvh]">

                {/* Titel-Bereich */}
                <section className="h-1/5 flex items-center justify-center w-full mb-10">
                    <h1 className="text-3xl font-light text-gray-900 text-center">
                        Ergebnisse für {sport} ({group})
                    </h1>
                </section>

                {/* Hauptinhalt */}
                <section className="h-4/5 w-full flex flex-col">
                    {/* Suchleiste */}
                    <input
                        type="text"
                        placeholder="🔍 Schüler suchen..."
                        className="mb-4 w-full p-3 border-2 border-blue-500 rounded-lg text-gray-900 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Schülerübersicht */}
                    <div className="flex-grow bg-white shadow-md rounded-lg p-4 overflow-y-auto border-2 border-blue-500">
                        {/* Desktop-Ansicht */}
                        <div className="hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="border-b border-gray-300 bg-blue-100">
                                    <th className="p-2 text-gray-700 text-left">Name</th>
                                    <th className="p-2 text-gray-700 text-right w-24">Versuch 1 ({getUnit()})</th>
                                    <th className="p-2 text-gray-700 text-right w-24">Versuch 2 ({getUnit()})</th>
                                    <th className="p-2 text-gray-700 text-right w-24">Versuch 3 ({getUnit()})</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map(student => (
                                        <tr key={student.id} className="border-b border-gray-200 text-black">
                                            <td className="p-3 font-medium text-left">
                                                {student.vorname} {student.nachname}
                                            </td>
                                            {[0, 1, 2].map(i => (
                                                <td key={i} className="p-2 text-right">
                                                    <input
                                                        type="number"
                                                        className="p-2 w-30 text-center text-gray-700 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        value={scores[student.id]?.[i] || ""}
                                                        onChange={(e) => handleScoreChange(student.id, i, e.target.value)}
                                                        placeholder="-"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="p-4 text-gray-600 text-center">
                                            Kein Schüler gefunden
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile-Ansicht */}
                        <div className="md:hidden flex flex-col gap-4">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <div key={student.id} className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 shadow-md flex flex-col">
                                        {/* Name */}
                                        <p className="text-gray-900 text-lg font-medium text-left">
                                            {student.vorname} {student.nachname}
                                        </p>

                                        {/* Versuche */}
                                        <div className="flex flex-col mt-3 gap-2">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <p className="text-gray-700">Versuch {i + 1} ({getUnit()}):</p>
                                                    <input
                                                        type="number"
                                                        className="p-2 w-1/2 text-center text-gray-700 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        value={scores[student.id]?.[i] || ""}
                                                        onChange={(e) => handleScoreChange(student.id, i, e.target.value)}
                                                        placeholder="-"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-600 text-center">Kein Schüler gefunden</p>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
