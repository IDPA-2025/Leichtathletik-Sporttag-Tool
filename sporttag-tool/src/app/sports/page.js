"use client"

import Link from "next/link";


export default function sports() {
    return (
        <div className="wrapper-container">
            <div className="transparent-container">
                <div className="h-1/5 bg-cyan-300 w-full">

                </div>
                <div className="flex items-center justify-around flex-wrap bg-amber-400 w-full h-4/5">
                    <div className="bg-blue-800 w-56 aspect-square"></div>
                    <div className="bg-blue-800 w-56 aspect-square"></div>
                    <div className="bg-blue-800 w-56 aspect-square"></div>
                    <div className="bg-blue-800 w-56 aspect-square"></div>
                    <div className="bg-blue-800 w-56 aspect-square"></div>


                </div>
            </div>
        </div>
    )
}