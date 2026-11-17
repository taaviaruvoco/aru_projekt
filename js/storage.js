const STORAGE_KEY = "opiplaan-data-v1";

const EMPTY_DATA = {
  tasks: [],
  preferences: { name: "", theme: "light" },
  focusSessions: []
};

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return structuredClone(EMPTY_DATA);

  const data = JSON.parse(raw);
  if (!data || typeof data !== "object" || !Array.isArray(data.tasks)) {
    throw new Error("Salvestatud andmete vorming ei ole korrektne.");
  }
  return {
    tasks: data.tasks,
    preferences: { ...EMPTY_DATA.preferences, ...(data.preferences || {}) },
    focusSessions: Array.isArray(data.focusSessions) ? data.focusSessions : []
  };
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearData() {
  localStorage.removeItem(STORAGE_KEY);
}
