// /api/export/generate-excel/route.js
import * as XLSX from "xlsx";
import {requireAnyRole} from "@/app/lib/auth";

export async function POST(req) {

    const user = requireAnyRole(req, ["teacher"]);

    try {
        const { exportData, showDetails, showGrades } = await req.json();
        const { ranglisten, titles, sportHeaders, sportUnitMap, sportNameMap } = exportData;

        // Die formatDisziplinZelle Funktion aus dem Frontend
        const formatDisziplinZelle = (s, sport, sportUnitMap) => {
            if (s.helfer) return "-";
            const detail = s.resultDetails?.[sport];
            if (detail?.skipped) return "Übersprungen";

            const value = detail?.value;
            const unit = sportUnitMap[sport] || "";
            const points = detail?.points;
            const grade = detail?.grade;

            const parts = [];
            if (value !== undefined && value !== null) parts.push(`${value} ${unit}`.trim());
            if (points != null) parts.push(`${points} Pkt.`);
            if (grade != null) parts.push(`Note: ${grade}`);

            return parts.join(" | ");
        };

        // Die generateDisziplinZellen Funktion aus dem Frontend
        const generateDisziplinZellen = (s, sportHeaders, sportUnitMap) => {
            return sportHeaders.map(sport => formatDisziplinZelle(s, sport, sportUnitMap));
        };

        // Die generateExportRow Funktion aus dem Frontend
        const generateExportRow = (s, i, sportHeaders, sportUnitMap) => {
            const rankDisplay = s.rang || (s.helfer ? "Helfer" : (i + 1));
            return [
                rankDisplay,
                s.vorname,
                s.nachname,
                s.klasse,
                s.total_points,
                ...(showGrades ? [s.grade ?? "-"] : []),
                ...(showDetails ? generateDisziplinZellen(s, sportHeaders, sportUnitMap) : [])
            ];
        };

        const wb = XLSX.utils.book_new();

        Object.keys(ranglisten).forEach((key) => {
            const list = ranglisten[key];

            if (list.length === 0) return;

            const headers = [
                "Rang", "Vorname", "Nachname", "Klasse", "Totale Punkte",
                ...(showGrades ? ["Note"] : []),
                ...(showDetails ? sportHeaders.map(code => sportNameMap?.[code] || code) : [])
            ];

            const rows = list.map((s, i) => generateExportRow(s, i, sportHeaders, sportUnitMap));
            const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

            // Excel Sheet Namen dürfen maximal 31 Zeichen haben
            const safeSheetName = key.substring(0, 31);
            XLSX.utils.book_append_sheet(wb, sheet, safeSheetName);
        });

        // Excel-Datei als Buffer zurückgeben
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        return new Response(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="rangliste.xlsx"'
            }
        });
    } catch (error) {
        console.error("Excel Export Error:", error);
        return Response.json({ error: error.message || "Fehler beim Generieren der Excel-Datei" }, { status: 500 });
    }
}