"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

export default function GroupOverview() {
    const { sport } = useParams()
    const [groups, setGroups] = useState([])

    useEffect(() => {
        const fetchGroups = async () => {
            const { data, error } = await supabase.from("students").select("klasse, geschlecht")
            if (error) {
                console.error("Fehler beim Laden der Schüler:", error)
                return
            }

            // Alle Gruppen generieren: "3a-weiblich", "2b-männlich", ...
            const groupSet = new Set()
            data.forEach(student => {
                const groupName = `${student.klasse}-${student.geschlecht.toLowerCase()}`
                groupSet.add(groupName)
            })

            setGroups(Array.from(groupSet).sort())
        }

        fetchGroups()
    }, [])

    return (
        <div className="wrapper-container h-screen">
            <div className="transparent-container h-full">
                <div className="h-1/5 bg-cyan-300 w-full flex items-center justify-center">
                    <h1 className="text-2xl font-bold">Gruppen für {sport}</h1>
                </div>
                <div className="flex h-4/5 bg-amber-600 w-full justify-center items-center flex-wrap gap-5 p-4">
                    {groups.map((group) => (
                        <Link key={group} href={`/sports/${sport}/${group}`}>
                            <div className="bg-blue-800 rounded-lg w-[min(25vw,100px)] md:w-[30%] lg:w-[20%] aspect-square flex items-center justify-center text-white font-semibold hover:bg-blue-600 transition">
                                {group}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
