"use client"

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"
import BackButton from "@/app/components/BackButton";

export default function GroupOverview() {
    const { sport } = useParams()
    const [groups, setGroups] = useState([])
    const [sportName, setSportName] = useState("");
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [showStickyButton, setShowStickyButton] = useState(false);

    const toggleGroup = (groupId) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const handleGoToResults = () => {
        if (selectedGroups.length > 0) {
            const groupParam = selectedGroups.join(",");
            window.location.href = `/sports/${sport}/${groupParam}`;
        }
    };



    useEffect(() => {
        const fetchGroups = async () => {
            const { data, error } = await supabase.from("students").select("klasse, geschlecht")
            if (error) {
                console.error("Fehler beim Laden der Schüler:", error)
                return
            }

            // Gruppen als Objekte mit Klasse und Geschlecht speichern
            const groupMap = new Map()
            data.forEach(student => {
                const groupKey = `${student.klasse}-${student.geschlecht.toLowerCase()}`
                if (!groupMap.has(groupKey)) {
                    groupMap.set(groupKey, { id: groupKey, klasse: student.klasse, geschlecht: student.geschlecht.toLowerCase() })
                }
            })

            setGroups(Array.from(groupMap.values()))
        }

        fetchGroups()
    }, [])

    useEffect(() => {
        const fetchSportName = async () => {
            const { data, error } = await supabase
                .from("sports")
                .select("name")
                .eq("code", sport)
                .single();

            if (error) {
                console.error("Fehler beim Laden des Sportnamens:", error);
                return;
            }

            setSportName(data.name);
        };

        if (sport) {
            fetchSportName();
        }
    }, [sport]);
    return (
        <div className="wrapper-container min-h-screen flex flex-col overflow-auto">
          <div className="transparent-container relative w-full flex flex-col items-center
                          sm:min-h-[90dvh] sm:max-h-[90dvh] sm:overflow-hidden">
      
            {/* Titel */}
            <div className="w-full py-6 flex items-center justify-center rounded-t-lg">
              <h1 className="text-4xl font-light text-gray-900">
                Gruppen für {sportName || sport}
              </h1>
            </div>
      
            {/* Button – sticky auf Desktop, normal auf Mobile */}
            <div
              className="w-full z-10 flex justify-center 
                         sm:sticky sm:top-[1rem] sm:bg-transparent"
            >
              <button
                onClick={handleGoToResults}
                disabled={selectedGroups.length === 0}
                className={`group relative inline-flex items-center gap-2 rounded-lg border px-6 py-2 transition-all duration-200 focus:outline-none
                  ${
                    selectedGroups.length === 0
                      ? 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100'
                      : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-md'
                  }`}
              >
                <span className="relative z-10 transition-colors duration-200 group-hover:text-inherit">
                  Ergebnisse anzeigen ({selectedGroups.length} Gruppen)
                </span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 transform
                    ${
                      selectedGroups.length === 0
                        ? 'text-gray-400'
                        : 'group-hover:translate-x-1 group-hover:text-white'
                    }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
      
            {/* Gruppenansicht */}
            <div className="w-full flex-1 flex justify-center items-start px-4 py-8">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-5xl">
                {groups.map(({ id, klasse, geschlecht }) => (
                  <div
                    key={id}
                    onClick={() => toggleGroup(id)}
                    className={`cursor-pointer relative aspect-square border-2 ${
                      selectedGroups.includes(id) ? 'border-blue-600 bg-blue-50' : 'border-green-500'
                    } rounded-lg transition flex flex-col items-center justify-center p-4`}
                  >
                    <p className="text-gray-700 text-xl md:text-2xl font-semibold text-center">
                      {klasse}
                    </p>
                    <div
                      className={`absolute bottom-0 right-0 w-0 h-0 border-b-[20px] border-l-[20px] sm:border-l-[50px] sm:border-b-[50px] border-transparent rounded-br-md ${
                        geschlecht === 'weiblich' ? 'border-b-pink-500' : 'border-b-blue-500'
                      }`}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      
          {/* Zurück-Button unten */}
          <BackButton />
        </div>
      )
}