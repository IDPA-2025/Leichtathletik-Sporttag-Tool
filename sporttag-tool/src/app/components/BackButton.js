"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="
  fixed bottom-4 left-1/2 -translate-x-1/2
  z-50 flex items-center gap-2
  px-4 py-2 sm:px-6 sm:py-3
  bg-white/70 backdrop-blur-md border border-gray-300
  text-gray-700 hover:bg-white hover:text-black
  shadow-md hover:shadow-lg
  rounded-full sm:rounded-xl
  text-sm sm:text-base
  transition-all duration-200
"

        >
            <ArrowLeft size={18} className="sm:size-5" />
            <span className="hidden sm:inline">Zurück</span>
        </button>
    );
}
