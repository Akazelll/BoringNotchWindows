import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { hydrateLyricsCache } from "../features/media/lib/lyricsCache";

// Isi cache lirik dari SQLite di latar belakang, jangan tunda paint pertama.
void hydrateLyricsCache();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
