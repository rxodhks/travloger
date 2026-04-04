import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme on load
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

// Apply saved color theme
import { applyTheme, getStoredThemeId } from "./lib/themes";
const storedTheme = getStoredThemeId();
if (storedTheme !== "default") {
  applyTheme(storedTheme);
}

createRoot(document.getElementById("root")!).render(<App />);
