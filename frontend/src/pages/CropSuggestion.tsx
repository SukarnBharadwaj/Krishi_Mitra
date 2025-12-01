// src/components/CropSuggestion.tsx
import React, { useState } from "react";

type ModelResponse = {
  predictions: string[];
  probabilities?: number[] | null;
  raw_output?: number[] | null;
};

const MODEL_SERVER_URL = (import.meta as any).env.VITE_MODEL_SERVER_URL || "http://localhost:8000";

export default function CropSuggestion() {
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [ph, setPh] = useState("");
  const [rainfall, setRainfall] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ModelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!nitrogen || !phosphorus || !potassium) {
      setError("Please enter Nitrogen, Phosphorus and Potassium values.");
      return;
    }

    const payload = {
      nitrogen: Number(nitrogen),
      phosphorus: Number(phosphorus),
      potassium: Number(potassium),
      temperature: temperature === "" ? 25.0 : Number(temperature),
      humidity: humidity === "" ? 50.0 : Number(humidity),
      ph: ph === "" ? 6.5 : Number(ph),
      rainfall: rainfall === "" ? 0.0 : Number(rainfall),
      top_k: 3,
    };

    setLoading(true);
    try {
      const res = await fetch(`${MODEL_SERVER_URL.replace(/\/+$/, "")}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Status ${res.status}`);
      }

      const data: ModelResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error("Predict error:", err);
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Soil Parameters</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Nitrogen (N) - kg/ha</label>
              <input value={nitrogen} onChange={(e) => setNitrogen(e.target.value)} type="number" className="w-full p-2 border rounded" placeholder="e.g., 43" required />
            </div>

            <div>
              <label className="block text-sm font-medium">Phosphorus (P) - kg/ha</label>
              <input value={phosphorus} onChange={(e) => setPhosphorus(e.target.value)} type="number" className="w-full p-2 border rounded" placeholder="e.g., 54" required />
            </div>

            <div>
              <label className="block text-sm font-medium">Potassium (K) - kg/ha</label>
              <input value={potassium} onChange={(e) => setPotassium(e.target.value)} type="number" className="w-full p-2 border rounded" placeholder="e.g., 23" required />
            </div>

            <div>
              <label className="block text-sm font-medium">Temperature (°C)</label>
              <input value={temperature} onChange={(e) => setTemperature(e.target.value)} type="number" className="w-full p-2 border rounded" placeholder="25" />
            </div>

            <div>
              <label className="block text-sm font-medium">Humidity (%)</label>
              <input value={humidity} onChange={(e) => setHumidity(e.target.value)} type="number" className="w-full p-2 border rounded" placeholder="50" />
            </div>

            <div>
              <label className="block text-sm font-medium">Soil pH</label>
              <input value={ph} onChange={(e) => setPh(e.target.value)} type="number" step="0.1" className="w-full p-2 border rounded" placeholder="6.5" />
            </div>

            <div>
              <label className="block text-sm font-medium">Rainfall (mm)</label>
              <input value={rainfall} onChange={(e) => setRainfall(e.target.value)} type="number" className="w-full p-2 border rounded" placeholder="0" />
            </div>

            <div>
              <button type="submit" disabled={loading} className="w-full bg-green-500 text-white py-2 rounded">
                {loading ? "Getting suggestions..." : "Get Crop Suggestions"}
              </button>
            </div>

            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

          </form>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Recommended Crops</h3>
          {!result && <div className="text-gray-500">Enter parameters and click "Get Crop Suggestions"</div>}

          {result && (
            <div className="space-y-3">
              {result.predictions.map((crop, i) => (
                <div key={i} className="p-3 border rounded">
                  <div className="font-semibold">{crop}</div>
                  {result.probabilities ? (
                    <div className="text-sm text-gray-600">Confidence: {(result.probabilities[i] * 100).toFixed(1)}%</div>
                  ) : (
                    <div className="text-sm text-gray-600">Recommended</div>
                  )}
                </div>
              ))}

              {/* {result.raw_output && (
                <details className="text-sm text-gray-500 mt-2">
                  <summary>Raw model output</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded">{JSON.stringify(result.raw_output, null, 2)}</pre>
                </details>
              )} */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
