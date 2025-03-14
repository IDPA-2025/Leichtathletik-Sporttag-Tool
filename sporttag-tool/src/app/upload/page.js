"use client";
import { useState } from "react";
import { Upload, X } from "lucide-react";
import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://your-supabase-url.supabase.co", "your-anon-key");

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [absentees, setAbsentees] = useState([]);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").slice(1); // Entfernt die Kopfzeile
      const parsedStudents = lines.map((line) => {
        const [nachname, vorname, anrede, klasse] = line.split(",");
        return {
          nachname: nachname.trim(),
          vorname: vorname.trim(),
          geschlecht: anrede.trim() === "Herr" ? "maennlich" : "weiblich",
          klasse: klasse.trim(),
        };
      }).filter(student => student.nachname);
      setStudents(parsedStudents);
    };
    reader.readAsText(uploadedFile);
  };

  const toggleHelper = (index) => {
    setHelpers((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleAbsentee = (index) => {
    setAbsentees((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSubmit = async () => {
    const payload = students.map((student, index) => ({
      vorname: student.vorname,
      nachname: student.nachname,
      geschlecht: student.geschlecht,
      klasse: student.klasse,
      helfer: helpers.includes(index),
      anwesend: !absentees.includes(index),
    }));

    const { data, error } = await supabase.from("students").insert(payload);
    if (error) {
      console.error("Fehler beim Einfügen in die Datenbank:", error);
    } else {
      console.log("Erfolgreich gespeichert:", data);
    }
  };

  return (
      <div className="wrapper-container">
        <div className="transparent-container">
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

          {/* Schülerliste */}
          <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-4 max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
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
                    <td className="p-2 text-center">
                      <input type="checkbox" onChange={() => toggleHelper(index)} checked={helpers.includes(index)} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox" onChange={() => toggleAbsentee(index)} checked={absentees.includes(index)} />
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>

          {/* Absenden-Button */}
          <button onClick={handleSubmit} className="mt-4 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
            Absenden
          </button>
        </div>
      </div>
  );
}