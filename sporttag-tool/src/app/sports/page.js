"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function SportsOverview() {
    const [sports, setSports] = useState([])

    const square = "bg-blue-800 rounded-lg w-[min(25vw,100px)] md:w-[30%] lg:w-[20%] aspect-square flex items-center justify-center text-white font-semibold hover:bg-blue-600 transition"

    useEffect(() => {
        const fetchSports = async () => {
            const { data, error } = await supabase.from("sports").select("*")
            if (error) {
                console.error("Fehler beim Laden der Sportarten:", error)
            } else {
                setSports(data)
            }
        }
        fetchSports()
    }, [])

    return (
        <div className="wrapper-container h-screen">
            <div className="transparent-container h-full">
                <div className="h-1/5 bg-cyan-300 w-full flex items-center justify-center">
                    <h1 className="text-2xl font-bold">Sportarten auswählen</h1>
                </div>
                <div className="flex h-4/5 bg-amber-600 w-full justify-center items-center flex-wrap gap-5 p-4">
                    {sports.map((sport) => (
                        <Link href={`/sports/${sport.code}`} key={sport.id}>
                            <div className={square}>{sport.name}</div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
