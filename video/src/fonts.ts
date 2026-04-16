const link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif&display=swap";

document.head.appendChild(link);

export const INTER = "'Inter', ui-sans-serif, sans-serif";
export const SERIF = "'Instrument Serif', 'Times New Roman', serif";
export const MONO = "ui-monospace, 'Menlo', monospace";
