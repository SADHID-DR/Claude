"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";

const STYLES = [
  { id: "modern", label: "Modern", icon: "◻" },
  { id: "minimalist", label: "Minimalist", icon: "—" },
  { id: "scandinavian", label: "Scandinavian", icon: "❄" },
  { id: "industrial", label: "Industrial", icon: "⚙" },
  { id: "bohemian", label: "Bohemian", icon: "✦" },
  { id: "mid-century", label: "Mid-Century", icon: "◑" },
  { id: "japandi", label: "Japandi", icon: "木" },
  { id: "coastal", label: "Coastal", icon: "〜" },
];

const ROOMS = [
  { id: "living-room", label: "Living Room" },
  { id: "bedroom", label: "Bedroom" },
  { id: "kitchen", label: "Kitchen" },
  { id: "bathroom", label: "Bathroom" },
  { id: "office", label: "Home Office" },
  { id: "dining-room", label: "Dining Room" },
];

export default function Home() {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [selectedRoom, setSelectedRoom] = useState("living-room");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("original");
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setResult(null);
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target.result);
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

  const handleGenerate = async () => {
    if (!image || !imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base64 = image.split(",")[1];
      const mediaType = imageFile.type;

      const res = await fetch("/api/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType, style: selectedStyle, room: selectedRoom }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data);
      setActiveTab("result");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    setActiveTab("original");
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>interior<span className={styles.logoAccent}>ai</span></div>
        <p className={styles.tagline}>Transform any room with AI</p>
      </header>

      <div className={styles.workspace}>
        {/* Left panel: controls */}
        <aside className={styles.panel}>
          <section className={styles.section}>
            <h3 className={styles.sectionLabel}>Room Type</h3>
            <div className={styles.roomGrid}>
              {ROOMS.map((r) => (
                <button
                  key={r.id}
                  className={`${styles.roomBtn} ${selectedRoom === r.id ? styles.active : ""}`}
                  onClick={() => setSelectedRoom(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionLabel}>Design Style</h3>
            <div className={styles.styleGrid}>
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`${styles.styleBtn} ${selectedStyle === s.id ? styles.active : ""}`}
                  onClick={() => setSelectedStyle(s.id)}
                >
                  <span className={styles.styleIcon}>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          {image && (
            <button className={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <span className={styles.spinner}>Redesigning<span className={styles.dots} /></span>
              ) : (
                "Generate Redesign"
              )}
            </button>
          )}

          {image && !loading && (
            <button className={styles.resetBtn} onClick={reset}>
              Upload new photo
            </button>
          )}
        </aside>

        {/* Right panel: canvas */}
        <div className={styles.canvas}>
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
              <div className={styles.dropIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <p className={styles.dropTitle}>Drop your room photo here</p>
              <p className={styles.dropSub}>or click to browse · PNG, JPG, WEBP</p>
            </div>
          ) : (
            <div className={styles.imageView}>
              {result && (
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${activeTab === "original" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("original")}
                  >
                    Original
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === "result" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("result")}
                  >
                    Redesigned
                  </button>
                </div>
              )}

              <div className={styles.imageFrame}>
                {activeTab === "original" || !result ? (
                  <img src={image} alt="Original room" className={styles.roomImage} />
                ) : null}

                {result && activeTab === "result" && (
                  <div className={styles.resultContent}>
                    <div className={styles.resultBadge}>
                      {STYLES.find(s => s.id === selectedStyle)?.label} · {ROOMS.find(r => r.id === selectedRoom)?.label}
                    </div>
                    <div className={styles.analysisBox}>
                      <h4 className={styles.analysisTitle}>AI Design Analysis</h4>
                      <p className={styles.analysisText}>{result.analysis}</p>
                    </div>
                    <div className={styles.recommendationsBox}>
                      <h4 className={styles.analysisTitle}>Design Recommendations</h4>
                      <ul className={styles.recList}>
                        {result.recommendations?.map((rec, i) => (
                          <li key={i} className={styles.recItem}>
                            <span className={styles.recDot} />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {result.colorPalette && (
                      <div className={styles.paletteBox}>
                        <h4 className={styles.analysisTitle}>Suggested Colors</h4>
                        <div className={styles.palette}>
                          {result.colorPalette.map((color, i) => (
                            <div key={i} className={styles.colorChip}>
                              <div className={styles.colorSwatch} style={{ background: color.hex }} />
                              <span className={styles.colorName}>{color.name}</span>
                              <span className={styles.colorHex}>{color.hex}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {loading && (
                  <div className={styles.loadingOverlay}>
                    <div className={styles.loadingSpinner} />
                    <p>Analyzing your room...</p>
                  </div>
                )}
              </div>

              {error && <p className={styles.errorMsg}>{error}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
