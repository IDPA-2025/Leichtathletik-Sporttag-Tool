"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import BackButton from "@/app/components/BackButton";
import DateSelect from "@/app/components/DateSelect";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [absentees, setAbsentees] = useState([]);
  const [classes, setClasses] = useState([]);
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

      const uniqueClasses = [...new Set(data.map(student => student.klasse))];
      setClasses(uniqueClasses);
    };

    fetchClasses();
  }, []);

// function berechneAlterskategorie(geburtsdatum) {
//   const veranstaltungsDatum = new Date("2025-06-01");
//   const geburtsdatumDate = new Date(geburtsdatum);
//   const diffInJahren = veranstaltungsDatum.getFullYear() - geburtsdatumDate.getFullYear();
//   const adjust = veranstaltungsDatum < new Date(geburtsdatumDate.setFullYear(veranstaltungsDatum.getFullYear()));
//   const alter = adjust ? diffInJahren - 1 : diffInJahren;

//   if (alter < 16) return "-15";
//   if (alter >= 16 && alter <= 17) return "16-17";
//   return "18+";
// }

  const updateAgeCategories = async () => {
    const response = await fetch("/api/students/recalculate-age", {
      method: "POST"
    });

    const result = await response.json();
    if (!response.ok) {
      alert("Fehler beim Aktualisieren der Alterskategorien: " + result.error);
    } else {
      console.log(`Alterskategorien aktualisiert: ${result.updated} Schüler`);
    }
  };



  const detectSeparator = (text) => text.includes(";") ? ";" : ",";

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const separator = detectSeparator(text);
      const lines = text.split("\n");
      if (lines.length < 2) return;

      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
      const nachnameIndex = headers.indexOf("nachname");
      const vornameIndex = headers.indexOf("vorname");
      const geburtsdatumIndex = headers.indexOf("geburtstag");
      const anredeIndex = headers.indexOf("anrede");
      const klasseIndex = headers.indexOf("klasse");

      if ([nachnameIndex, vornameIndex, geburtsdatumIndex, anredeIndex, klasseIndex].includes(-1)) {
        alert("Die CSV-Datei enthält nicht alle erforderlichen Spalten!");
        return;
      }

      const parsedStudents = lines.slice(1).map((line) => {
        const values = line.split(separator).map(v => v.trim());
        const geburtsdatum = convertDate(values[geburtsdatumIndex]);
        return {
          nachname: values[nachnameIndex] || "",
          vorname: values[vornameIndex] || "",
          geburtsdatum,
          geschlecht: values[anredeIndex] === "Herr" ? "maennlich" : "weiblich",
          klasse: values[klasseIndex] || "",
          helfer: false,
          anwesend: true,
          age_category: berechneAlterskategorie(geburtsdatum),
        };
      }).filter(student => student.nachname && student.vorname && student.klasse);

      const uploadedClasses = [...new Set(parsedStudents.map(s => s.klasse))];
      const existing = uploadedClasses.filter(cls => classes.includes(cls));

      if (existing.length > 0) {
        alert(`Die Klasse "${existing[0]}" existiert bereits und kann nicht erneut hochgeladen werden.`);
        return;
      }

      setStudents(parsedStudents);
    };

    reader.readAsText(uploadedFile);
  };

  const convertDate = (dateStr) => {
    if (!dateStr) return null;
    let delimiter = dateStr.includes("/") ? "/" : ".";
    const parts = dateStr.split(delimiter);
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    if (students.length === 0) {
      alert("Keine Schülerdaten zum Hochladen!");
      return;
    }

    setLoading(true);

    const updatedStudents = students.map((student, index) => ({
      ...student,
      helfer: helpers.includes(index),
      anwesend: !absentees.includes(index),
    }));

    const { error } = await supabase
        .from("students")
        .upsert(updatedStudents, { onConflict: ["id"] });

    setLoading(false);

    if (error) {
      console.error("Fehler beim Hochladen:", error);
      alert(`Fehler beim Hochladen: ${error.message}`);
    } else {
      alert("Erfolgreich gespeichert!");
      location.reload(); // ❗️ Hier wird neu geladen – dadurch wird updateAgeCategories nie aufgerufen
    }
  };


    setLoading(true);

    const updatedStudents = students.map((student, index) => ({
      ...student,
      helfer: helpers.includes(index),
      anwesend: !absentees.includes(index),
    }));

    const { error } = await supabase
        .from("students")
        .upsert(updatedStudents, { onConflict: ["id"] });

    setLoading(false);

    if (error) {
      console.error("Fehler beim Hochladen:", error);
      alert(`Fehler beim Hochladen: ${error.message}`);
    } else {
      alert("Erfolgreich gespeichert!");
      location.reload();
    }
  };

  const handleDeleteClassDirect = async (cls) => {
    const confirmDelete = window.confirm(`Möchtest du wirklich alle Schüler der Klasse ${cls} löschen?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from("students").delete().eq("klasse", cls);

    if (error) {
      console.error("Fehler beim Löschen der Klasse:", error);
    } else {
      alert(`Alle Schüler der Klasse ${cls} wurden gelöscht.`);
      setClasses(classes.filter((c) => c !== cls));
    }
  };

  const handleEditClass = async (cls) => {
    const { data, error } = await supabase.from("students").select("*").eq("klasse", cls);

    if (error) {
      console.error("Fehler beim Laden der Klasse:", error);
      alert(`Fehler beim Laden: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      alert(`Keine Schüler in Klasse ${cls} gefunden.`);
      return;
    }

    setStudents(data);
    setHelpers(data.map((s, i) => s.helfer ? i : null).filter(i => i !== null));
    setAbsentees(data.map((s, i) => !s.anwesend ? i : null).filter(i => i !== null));
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
    if (!absentees.includes(index)) {
      setHelpers((prev) => prev.filter((i) => i !== index));
    }
  };

  return (
      <div className="wrapper-container">
        <div className="transparent-container-upload flex flex-col lg:flex-row gap-6">
          <div className="basis-0 grow w-full lg:max-w-[260px] flex flex-col sm:flex-row lg:flex-col items-center gap-4">
            <div className="w-full bg-white bg-opacity-80 shadow-md rounded-lg p-4 max-h-[400px] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2 text-gray-800 text-center">Schon hochgeladene Klassen:</h3>
              <ul className="space-y-2">
                {classes.map((cls) => (
                    <li key={cls} className="flex justify-between items-center text-sm text-gray-800 bg-gray-100 rounded px-2 py-1">
                      <span>{cls}</span>
                      <div className="flex space-x-1">
                        <button onClick={() => handleEditClass(cls)} className="text-blue-600 hover:text-blue-800" title="Klasse bearbeiten">📝</button>
                        <button onClick={() => handleDeleteClassDirect(cls)} className="text-red-600 hover:text-red-800 font-bold" title={`Lösche Klasse ${cls}`}>✕</button>
                      </div>
                    </li>
                ))}
              </ul>
            </div>

            <DateSelect />
          </div>

          <div className="basis-0 grow w-full flex flex-col items-center gap-6">
            <h2 className="mid-title">Klassenliste hochladen</h2>

            <div className="border-2 border-dashed border-blue-500 w-full max-w-2xl h-32 flex flex-col items-center justify-center rounded-lg p-4">
              <Upload size={32} className="text-blue-600" />
              <p className="text-gray-700 text-sm">Drag & Drop Klassenliste hier</p>
              <label className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-600">
                Datei suchen
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="bg-white shadow-md rounded-lg p-4 max-h-[30dvh] overflow-y-auto w-full">
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
                        <button className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`} onClick={() => toggleHelper(index)} disabled={absentees.includes(index)}>
                          Helfer
                        </button>
                      </td>
                      <td className="p-2 flex justify-center">
                        <button className={`absent-button ${absentees.includes(index) ? "active" : "inactive"}`} onClick={() => toggleAbsentee(index)} />
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>

              <div className="md:hidden flex flex-col gap-4">
                {students.map((student, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-3 shadow-sm">
                      <p className={`text-lg font-medium ${absentees.includes(index) ? "text-gray-400 line-through" : "text-black"}`}>{student.vorname} {student.nachname}</p>
                      <p className="text-gray-600">Klasse: {student.klasse} | Geschlecht: {student.geschlecht}</p>
                      <div className="flex justify-between mt-2 items-center">
                        <button className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`} onClick={() => toggleHelper(index)} disabled={absentees.includes(index)}>
                          Helfer
                        </button>
                        <button className={`absent-button ${absentees.includes(index) ? "active" : "inactive"}`} onClick={() => toggleAbsentee(index)} />
                      </div>
                    </div>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} className={`mt-4 text-white px-6 py-3 rounded-lg shadow-md transition-all ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`} disabled={loading}>
              {loading ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </div>
      </div>
  );
}
