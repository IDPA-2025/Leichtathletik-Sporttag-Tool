"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "../lib/supabaseClient"

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [absentees, setAbsentees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
          .from("students")
          .select("klasse")
          .not("klasse", "is", null)
          .order("klasse", { ascending: true });

      if (error) {
        console.error("Fehler beim Laden der Klassen:", error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.warn("Keine Klassen in der Datenbank gefunden.");
        setClasses([]);
        return;
      }

      const uniqueClasses = [...new Set(data.map(student => student.klasse))];
      setClasses(uniqueClasses);
    };

    fetchClasses();
  }, []);

  const detectSeparator = (text) => {
    if (text.includes(";")) return ";";
    return ","; // Standardmäßig Komma
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      console.log("CSV Inhalt:\n", text);

      const separator = detectSeparator(text);
      console.log("Erkannter Separator:", separator);

      const lines = text.split("\n");
      if (lines.length < 2) {
        console.warn("Die CSV-Datei scheint leer oder fehlerhaft zu sein!");
        return;
      }

      // Header identifizieren und Positionen der relevanten Spalten speichern
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
      console.log("Header erkannt:", headers);

      const nachnameIndex = headers.indexOf("nachname");
      const vornameIndex = headers.indexOf("vorname");
      const geburtsdatumIndex = headers.indexOf("geburtstag");
      const anredeIndex = headers.indexOf("anrede");
      const klasseIndex = headers.indexOf("klasse");

      if (nachnameIndex === -1 || vornameIndex === -1 || geburtsdatumIndex === -1 || anredeIndex === -1 || klasseIndex === -1) {
        console.error("Fehlende Spalten in der CSV!");
        return;
      }

      // Daten extrahieren
      const parsedStudents = lines.slice(1).map((line) => {
        const values = line.split(separator).map(v => v.trim());

        return {
          nachname: values[nachnameIndex] || "",
          vorname: values[vornameIndex] || "",
          geburtsdatum: convertDate(values[geburtsdatumIndex]),
          geschlecht: values[anredeIndex] === "Herr" ? "maennlich" : "weiblich",
          klasse: values[klasseIndex] || "",
          helfer: false,
          anwesend: true,
        };
      }).filter(student => student.nachname && student.vorname && student.klasse);

      console.log("Parsed Students:", parsedStudents);
      setStudents(parsedStudents);
    };

    reader.readAsText(uploadedFile);
  };

  const convertDate = (dateStr) => {
    if (!dateStr) return null;

    let delimiter = ".";
    if (dateStr.includes("/")) delimiter = "/";

    const parts = dateStr.split(delimiter);
    if (parts.length !== 3) {
      console.warn("Ungültiges Datum:", dateStr);
      return null;
    }

    const [day, month, year] = parts;
    return `${year}-${month}-${day}`; // Wandelt 12.05.2006 → 2006-05-12 um
  };

  const handleSubmit = async () => {
    if (students.length === 0) {
      alert("Keine Schülerdaten zum Hochladen!");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("students").insert(students);

    setLoading(false);
    if (error) {
      console.error("Fehler beim Speichern in Supabase:", error);
      alert(`Fehler beim Hochladen: ${error.message}`);
    } else {
      alert("Erfolgreich gespeichert!");
      setStudents([]);
    }
  };

  const toggleHelper = (index) => {
    if (!absentees.includes(index)) {
      setHelpers((prev) =>
          prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    }
  };

  const toggleAbsentee = (index) => {
    setAbsentees((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );

    // Falls als "Abwesend" markiert, entferne Helfer-Status
    if (!absentees.includes(index)) {
      setHelpers(prev => prev.filter(i => i !== index));
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) {
      alert("Bitte wähle eine Klasse zum Löschen aus.");
      return;
    }

    const confirmDelete = window.confirm(`Möchtest du wirklich alle Schüler der Klasse ${selectedClass} löschen?`);
    if (!confirmDelete) return;

    const { error } = await supabase
        .from("students")
        .delete()
        .eq("klasse", selectedClass);

    if (error) {
      console.error("Fehler beim Löschen der Klasse:", error);
    } else {
      alert(`Alle Schüler der Klasse ${selectedClass} wurden gelöscht.`);
      setClasses(classes.filter(cls => cls !== selectedClass));
      setSelectedClass("");
    }
  };

  return (
      <div className="wrapper-container">
        <div className="transparent-container text-center flex flex-col items-center">
          <h2 className="mid-title">Klassenliste hochladen</h2>

          {/* Upload-Bereich */}
          <div className="border-2 border-dashed border-blue-500 w-full max-w-2xl h-32 flex flex-col items-center justify-center rounded-lg p-4 mb-6">
            <Upload size={32} className="text-blue-600" />
            <p className="text-gray-700 text-sm">Drag & Drop Klassenliste hier</p>
            <label className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-600">
              Datei suchen
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* Dropdown zum Löschen einer Klasse */}
          <div className="w-full max-w-2xl flex flex-col items-center">
            <label className="text-lg font-semibold text-gray-900 mb-2">Klasse löschen:</label>
            <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="p-3 border-2 border-red-500 rounded-lg w-full max-w-md text-gray-900"
            >
              <option value="">-- Wähle eine Klasse --</option>
              {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <button
                onClick={handleDeleteClass}
                className="mt-3 bg-red-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-red-600 transition-all"
            >
              Klasse löschen
            </button>
          </div>

          {/* Schülerliste */}
          <div className="xl:w-1/2 bg-white shadow-md rounded-lg p-4 max-h-[500px] overflow-y-auto w-full">

            {/* Desktop-Tabelle */}
            <table className="hidden md:table w-full text-center border-collapse">
              <thead>
              <tr className="border-b border-gray-300">
                <th className="p-2 text-gray-700">Name</th>
                <th className="p-2 text-gray-700">Geschlecht</th>
                <th className="p-2 text-gray-700">Klasse</th>
                <th className="p-2 text-gray-700">Helfer</th>
                <th className="p-2 text-gray-700">Abwesend</th>
              </tr>
              </thead>
              <tbody>
              {students.map((student, index) => (
                  <tr key={index} className="border-b border-gray-200 text-black">
                    <td className="p-2">{`${student.nachname}, ${student.vorname}`}</td>
                    <td className="p-2">{student.geschlecht}</td>
                    <td className="p-2">{student.klasse}</td>
                    <td className="p-2">
                      <button
                          className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`}
                          onClick={() => toggleHelper(index)}
                          disabled={absentees.includes(index)}
                      >
                        Helfer
                      </button>
                    </td>
                    <td className="p-2 flex justify-center">
                      <button
                          className={`absent-button ${absentees.includes(index) ? "active" : "inactive"} `}
                          onClick={() => toggleAbsentee(index)}
                      />
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>

            {/* Mobile-Ansicht */}
            <div className="md:hidden flex flex-col gap-4">
              {students.map((student, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-3 shadow-sm">
                    <p className={`text-lg font-medium ${absentees.includes(index) ? "text-gray-400 line-through" : "text-black"}`}>
                      {student.vorname} {student.nachname}
                    </p>
                    <p className="text-gray-600">Klasse: {student.klasse} | Geschlecht: {student.geschlecht}</p>

                    {/* Buttons */}
                    <div className="flex justify-between mt-2 items-center">
                      <button
                          className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`}
                          onClick={() => toggleHelper(index)}
                          disabled={absentees.includes(index)}
                      >
                        Helfer
                      </button>
                      <button
                          className={`absent-button ${absentees.includes(index) ? "active" : "inactive"}`}
                          onClick={() => toggleAbsentee(index)}
                      />
                    </div>
                  </div>
              ))}
            </div>

          </div>

          {/* Speicher-Button */}
          <button
              onClick={handleSubmit}
              className={`mt-4 text-white px-6 py-3 rounded-lg shadow-md transition-all ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
              }`}
              disabled={loading}
          >
            {loading ? "Speichert..." : "Speichern"}
          </button>
        </div>
      </div>
  );
}
