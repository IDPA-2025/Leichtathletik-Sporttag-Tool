"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
    const router = useRouter();

    return (
        <button
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg
                 shadow-md flex items-center gap-2 hover:bg-blue-600 transition-all"
            onClick={() => router.back()}
        >
            <ArrowLeft size={20} />
        </button>
    );
}
