"use client";
import { useState } from "react";
import { Upload, X } from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [classes, setClasses] = useState([
    { name: "3l", students: 15 },
    { name: "3m", students: 18 },
  ]);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
  };

  const handleDelete = (index) => {
    setClasses(classes.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-zurich flex justify-center items-center h-screen">
      <div className="bg-white/50 backdrop-blur-md shadow-lg rounded-lg p-10 w-[85vw] h-[75vh] flex flex-col justify-center items-center">
        <h1 className="text-4xl font-light text-gray-900 mb-6">Klassenliste hochladen</h1>

        {/* Upload-Bereich */}
        <div className="border-2 border-dashed border-blue-500 w-full max-w-2xl h-32 flex flex-col items-center justify-center rounded-lg p-4 mb-6">
          <Upload size={32} className="text-blue-600" />
          <p className="text-gray-700 text-sm">Drag & Drop Klassenliste hier</p>
          <label className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-600">
            Datei suchen
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Tabelle */}
        <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="p-2 text-gray-700">Klasse</th>
                <th className="p-2 text-gray-700">Anzahl Schüler</th>
                <th className="p-2 text-gray-700">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="p-2">{cls.name}</td>
                  <td className="p-2">{cls.students}</td>
                  <td className="p-2">
                    <button className="bg-green-500 text-white px-3 py-1 rounded-md mr-2">Edit</button>
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded-md"
                      onClick={() => handleDelete(index)}
                    >
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Gruppen-Button */}
        <button className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
          Gruppen ansehen
        </button>
      </div>
    </div>
  );
}