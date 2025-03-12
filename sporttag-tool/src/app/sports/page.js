"use client"

import Link from "next/link";

export default function sports() {
    const square = "bg-blue-800 rounded-lg w-[min(25vw,100px)] md:w-[30%] lg:w-[20%] aspect-square";
    return (
        <div className="wrapper-container h-screen">
            <div className="transparent-container h-full">
                <div className="h-1/5 bg-cyan-300 w-full">
                </div>
                <div className="flex h-4/5 bg-amber-600 w-full justify-center items-center flex-wrap gap-5">
                    <div className={square}></div>
                    <div className={square}></div>
                    <div className={square}></div>
                    <div className={square}></div>
                    <div className={square}></div>
                </div>
            </div>
        </div>
    )
}
