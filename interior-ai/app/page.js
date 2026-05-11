"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";

const SPACE_TYPES = [
  "Master bathroom suite",
  "Guest bathroom",
  "Living room",
  "Kitchen",
  "Bedroom",
  "Home office",
  "Dining room",
  "Entryway",
  "Corridor",
  "Other",
];

const RENDER_ENGINES = [
  "Gemini Image Studio (Imagen 4)",
  "Stable Diffusion 3.5",
  "Midjourney",
  "3D Studio Max + V-Ray",
  "Cinema 4D + Corona",
  "Blender + Cycles",
];

const STYLES = [
  "Modern Minimalist",
  "Tropical Modern",
  "Industrial",
  "Scandinavian",
  "Bohemian",
  "Japandi",
  "Coastal",
  "Mid-Century Modern",
  "Contemporary",
  "Traditional",
];

const PLAN_PERSPECTIVES = [
  "Full floor plan view with dimensions",
  "3D axonometric view",
  "Furniture layout detail",
];

const ELEVATION_PERSPECTIVES = [
  "Full wall elevation view",
  "Material detail close-up",
  "Fixture and hardware focus",
  "Overall room perspective",
  "Ambient interior view",
];

export default function Home() {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [drawingType, setDrawingType] = useState(null);
  const [error, setError] = useState(null);

  const [spaceType, setSpaceType] = useState("Master bathroom suite");
  const [area, setArea] = useState("");
  const [renderEngine, setRenderEngine] = useState("Gemini Image Studio (Imagen 4)");
  const [style, setStyle] = useState("Modern Minimalist");
  const [notes, setNotes] = useState("");
  const [perspectives, setPerspectives] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [prompts, setPrompts] = useState(null);

  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    setDrawingType(null);
    setPrompts(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = async (e) => {
      setImage(e.target.result);
      setAnalyzing(true);

      try {
        const base64 = e.target.result.split(",")[1];
        const res = await fetch("/api/analyze-drawing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: file.type }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setDrawingType(data.type);
        setPerspectives([]);
      } catch (err) {
        setError(err.message);
      } finally {
        setAnalyzing(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const togglePerspective = (p) => {
    setPerspectives((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleGenerate = async () => {
    if (!image || !drawingType || perspectives.length === 0) {
      setError("Please upload a drawing and select at least one perspective");
      return;
    }

    setGenerating(true);
    setError(null);
    setPrompts(null);

    try {
      const base64 = image.split(",")[1];
      const res = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mediaType: imageFile.type,
          drawingType,
          spaceType,
          area,
          renderEngine,
          style,
          notes,
          perspectives,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrompts(data.prompts);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageFile(null);
    setDrawingType(null);
    setPrompts(null);
    setError(null);
    setPerspectives([]);
  };

  const availablePerspectives =
    drawingType === "floor-plan" ? PLAN_PERSPECTIVES : ELEVATION_PERSPECTIVES;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <p className={styles.studio}>PLAN-TO-RENDER STUDIO</p>
          <h1 className={styles.title}>Render Prompt Generator</h1>
        </div>
      </header>

      <div className={styles.container}>
        {/* Upload Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.label}>UPLOAD DRAWING</span>
          </h2>

          {!image ? (
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <div className={styles.dropIcon}>📐</div>
              <p className={styles.dropTitle}>Drop your drawing here</p>
              <p className={styles.dropSub}>or click to browse · JPG, PNG, PDF</p>
            </div>
          ) : (
            <div className={styles.uploadedSection}>
              <div className={styles.uploadedImage}>
                <img src={image} alt="Uploaded drawing" />
              </div>

              {analyzing && (
                <div className={styles.analyzing}>
                  <div className={styles.spinner} />
                  <p>Analyzing drawing type...</p>
                </div>
              )}

              {drawingType && !analyzing && (
                <div className={styles.drawingInfo}>
                  <p className={styles.drawingType}>
                    Detected: <strong>{drawingType === "floor-plan" ? "Floor Plan" : "Elevation"}</strong>
                  </p>
                  <button className={styles.changeBtn} onClick={reset}>
                    Upload different drawing
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}
        </section>

        {image && drawingType && (
          <>
            {/* Project Context */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.label}>PROJECT CONTEXT</span>
              </h2>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Space Type</label>
                  <select
                    className={styles.select}
                    value={spaceType}
                    onChange={(e) => setSpaceType(e.target.value)}
                  >
                    {SPACE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Approximate Area (m²)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. 18"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Target Render Engine</label>
                  <select
                    className={styles.select}
                    value={renderEngine}
                    onChange={(e) => setRenderEngine(e.target.value)}
                  >
                    {RENDER_ENGINES.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Preferred Style</label>
                  <select
                    className={styles.select}
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                  >
                    {STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Additional Notes (Materials, Mood, Client Brief, Orientation)
                </label>
                <textarea
                  className={styles.textarea}
                  placeholder="e.g. client wants travertine floors, brushed bronze fixtures, views to tropical garden, open shower, double vanity on north wall..."
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </section>

            {/* Render Perspectives */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.label}>RENDER PERSPECTIVES</span>
              </h2>

              <div className={styles.perspectiveGrid}>
                {availablePerspectives.map((p) => (
                  <button
                    key={p}
                    className={`${styles.perspectiveBtn} ${
                      perspectives.includes(p) ? styles.active : ""
                    }`}
                    onClick={() => togglePerspective(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </section>

            {/* Generate Button */}
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={generating || perspectives.length === 0}
            >
              {generating ? (
                <span>
                  Generating prompts<span className={styles.dots} />
                </span>
              ) : (
                "Analyze Plans & Generate Prompts ↗"
              )}
            </button>

            {/* Results */}
            {prompts && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.label}>GENERATED PROMPTS</span>
                </h2>

                <div className={styles.promptsList}>
                  {prompts.map((prompt, i) => (
                    <div key={i} className={styles.promptCard}>
                      <h3 className={styles.promptTitle}>{prompt.perspective}</h3>
                      <p className={styles.promptText}>{prompt.prompt}</p>
                      <button
                        className={styles.copyBtn}
                        onClick={() => {
                          navigator.clipboard.writeText(prompt.prompt);
                          alert("Copied to clipboard!");
                        }}
                      >
                        Copy prompt
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
