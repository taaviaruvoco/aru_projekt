import { clearData, loadData, saveData } from "./storage.js";
import {
  escapeHtml, getTaskFormValues, localDateString, renderTaskList, renderTaskPreviews, validateTask
} from "./tasks.js";
import { moveCalendar, renderCalendar, selectCalendarDate, setCalendarMode } from "./calendar.js";
import { initPomodoro, startFocus } from "./pomodoro.js";

const EMPTY_DATA = { tasks: [], preferences: { name: "", theme: "light" }, focusSessions: [] };
const PAGE_TITLES = { dashboard: "Avaleht", tasks: "Minu ülesanded", calendar: "Kalender", pomodoro: "Keskendumine", progress: "Edenemine", settings: "Seaded" };
const WEEKDAY = new Intl.DateTimeFormat("et-EE", { weekday: "short" });
const FULL_DATE = new Intl.DateTimeFormat("et-EE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
let state;
let taskFilter = "all";
let searchQuery = "";

function toast(message, isError = false) {
  const region = document.querySelector("#toast-region");
  const item = document.createElement("div");
  item.className = `toast${isError ? " error" : ""}`;
  item.textContent = message;
  region.append(item);
  window.setTimeout(() => item.remove(), 3600);
}

function persist(message = "Muudatused salvestatud.") {
  try {
    saveData(state);
    if (message) toast(message);
  } catch (error) {
    console.error("ÕpiPlaan ei saanud andmeid salvestada.", error);
    toast("Andmeid ei saanud salvestada. Kontrolli brauseri salvestusruumi seadeid.", true);
  }
}

function formatDay(date) {
  return localDateString(date);
}

function lastSevenDays() {
  const days = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    days.push({ date, key: formatDay(date), label: WEEKDAY.format(date).replace(".", "") });
  }
  return days;
}

function makeBarChart(container, entries, todayKey, valueForEntry, colorMode = "green") {
  const values = entries.map(valueForEntry);
  const max = Math.max(1, ...values);
  container.innerHTML = entries.map((entry, index) => {
    const value = values[index];
    const height = value ? Math.max(8, value / max * 100) : 4;
    const todayClass = entry.key === todayKey ? " today-bar" : "";
    const valueClass = value ? " has-value" : "";
    return `<div class="chart-column" aria-label="${escapeHtml(entry.label)}: ${value}"><div class="chart-bar-wrap"><div class="chart-bar${valueClass}${todayClass}${colorMode === "blue" ? " blue-bar" : ""}" style="height:${height}%" title="${value}"></div></div><span class="chart-label">${escapeHtml(entry.label)}</span></div>`;
  }).join("");
}

function statsMarkup(items) {
  return items.map((item) => `<article class="stat-card"><span class="stat-icon ${item.color}"><svg class="icon"><use href="#${item.icon}"/></svg></span><span class="stat-copy"><strong>${item.value}</strong><span>${item.label}</span></span></article>`).join("");
}

function renderDashboard() {
  const today = formatDay(new Date());
  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);
  const weekLaterKey = formatDay(weekLater);
  const todayTasks = state.tasks.filter((task) => task.dueDate === today);
  const completed = state.tasks.filter((task) => task.completed).length;
  const overdue = state.tasks.filter((task) => !task.completed && task.dueDate < today).length;
  const upcoming = state.tasks.filter((task) => !task.completed && task.dueDate >= today && task.dueDate <= weekLaterKey);

  document.querySelector("#dashboard-stats").innerHTML = statsMarkup([
    { color: "green", icon: "i-calendar", value: todayTasks.length, label: "Tänased ülesanded" },
    { color: "blue", icon: "i-check", value: completed, label: "Lõpetatud ülesanded" },
    { color: "red", icon: "i-clock", value: overdue, label: "Üle tähtaja" },
    { color: "orange", icon: "i-spark", value: upcoming.length, label: "Tähtaeg lähipäevil" }
  ]);
  document.querySelector("#today-count").textContent = String(todayTasks.length);
  renderTaskPreviews(document.querySelector("#today-list"), todayTasks, "Tänaseks pole midagi planeeritud.");
  renderTaskPreviews(document.querySelector("#upcoming-list"), upcoming, "Järgmise 7 päeva jooksul pole tähtaegu.");
  const week = lastSevenDays();
  const completedByDay = state.tasks.filter((task) => task.completed && task.completedAt).reduce((counts, task) => {
    const key = formatDay(new Date(task.completedAt));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const weekCount = week.reduce((count, day) => count + (completedByDay[day.key] || 0), 0);
  document.querySelector("#week-completed").textContent = String(weekCount);
  makeBarChart(document.querySelector("#dashboard-chart"), week, today, (day) => completedByDay[day.key] || 0);
}

function renderTasks() {
  const active = state.tasks.filter((task) => !task.completed).length;
  const completed = state.tasks.length - active;
  document.querySelector("#nav-task-count").textContent = String(active);
  document.querySelector("#filter-all-count").textContent = String(state.tasks.length);
  document.querySelector("#filter-active-count").textContent = String(active);
  document.querySelector("#filter-completed-count").textContent = String(completed);
  document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === taskFilter));
  renderTaskList(document.querySelector("#task-list"), state.tasks, taskFilter, searchQuery);
}

function renderProgress() {
  const done = state.tasks.filter((task) => task.completed).length;
  const remaining = state.tasks.length - done;
  const percent = state.tasks.length ? Math.round(done / state.tasks.length * 100) : 0;
  const week = lastSevenDays();
  const completedByDay = state.tasks.filter((task) => task.completed && task.completedAt).reduce((counts, task) => {
    const key = formatDay(new Date(task.completedAt));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const focusByDay = state.focusSessions.reduce((totals, session) => {
    if (!session.completedAt) return totals;
    const key = formatDay(new Date(session.completedAt));
    totals[key] = (totals[key] || 0) + (Number(session.minutes) || 25);
    return totals;
  }, {});
  const weekFocus = week.reduce((sum, day) => sum + (focusByDay[day.key] || 0), 0);
  document.querySelector("#progress-stats").innerHTML = statsMarkup([
    { color: "green", icon: "i-check", value: done, label: "Lõpetatud ülesannet" },
    { color: "blue", icon: "i-book", value: remaining, label: "Veel tegemata" },
    { color: "orange", icon: "i-chart", value: `${percent}%`, label: "Ülesannete edenemine" },
    { color: "red", icon: "i-clock", value: `${weekFocus} min`, label: "Fookust sel nädalal" }
  ]);
  makeBarChart(document.querySelector("#progress-chart"), week, formatDay(new Date()), (day) => completedByDay[day.key] || 0);
  makeBarChart(document.querySelector("#study-chart"), week, formatDay(new Date()), (day) => focusByDay[day.key] || 0, "blue");
  document.querySelector("#completion-percent").textContent = `${percent}%`;
  document.querySelector("#completion-ring").style.background = `conic-gradient(var(--green) ${percent}%, var(--line) ${percent}% 100%)`;
  document.querySelector("#completion-caption").textContent = state.tasks.length
    ? `Oled lõpetanud ${done} ülesannet ${state.tasks.length}-st.`
    : "Alusta esimese ülesande lisamisega.";
  document.querySelector("#week-focus-total").textContent = `${weekFocus} min`;
}

function renderPomodoroStats() {
  const today = formatDay(new Date());
  const sessions = state.focusSessions.filter((session) => session.completedAt && formatDay(new Date(session.completedAt)) === today);
  const minutes = sessions.reduce((sum, session) => sum + (Number(session.minutes) || 25), 0);
  document.querySelector("#focus-today").textContent = `${minutes} min`;
  document.querySelector("#focus-sessions-today").textContent = `${sessions.length} õppimisringi lõpetatud`;
}

function renderProfile() {
  const name = state.preferences.name.trim() || "Õppija";
  document.querySelector("#welcome-name").textContent = name;
  document.querySelector("#sidebar-name").textContent = name;
  document.querySelector("#avatar-initial").textContent = [...name][0].toLocaleUpperCase("et");
  document.querySelector("#display-name").value = state.preferences.name;
}

function renderAll() {
  renderProfile();
  renderDashboard();
  renderTasks();
  renderCalendar(state.tasks);
  renderProgress();
  renderPomodoroStats();
}

function setTheme(theme) {
  state.preferences.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.preferences.theme;
  document.querySelector("#theme-toggle use").setAttribute("href", state.preferences.theme === "dark" ? "#i-sun" : "#i-moon");
  document.querySelector("#settings-theme").setAttribute("aria-pressed", String(state.preferences.theme === "dark"));
}

function navigateTo(page) {
  if (!Object.hasOwn(PAGE_TITLES, page)) return;
  document.querySelectorAll(".page-section").forEach((section) => section.classList.toggle("active", section.id === `page-${page}`));
  document.querySelectorAll(".nav-link[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  document.querySelector("#page-title").textContent = PAGE_TITLES[page];
  document.querySelector("#sidebar").classList.remove("open");
  if (page === "calendar") renderCalendar(state.tasks);
}

function openTaskDialog(task = null) {
  const form = document.querySelector("#task-form");
  form.reset();
  form.elements.id.value = task?.id || "";
  form.elements.title.value = task?.title || "";
  form.elements.subject.value = task?.subject || "";
  form.elements.dueDate.value = task?.dueDate || formatDay(new Date());
  form.elements.priority.value = task?.priority || "medium";
  form.elements.category.value = task?.category || "Kodutöö";
  form.elements.description.value = task?.description || "";
  document.querySelector("#dialog-title").textContent = task ? "Muuda ülesannet" : "Lisa ülesanne";
  document.querySelector("#save-task-label").textContent = task ? "Salvesta muudatused" : "Salvesta ülesanne";
  document.querySelector("#form-error").textContent = "";
  document.querySelector("#task-dialog").showModal();
  form.elements.title.focus();
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = getTaskFormValues(form);
  const error = validateTask(values);
  const errorElement = document.querySelector("#form-error");
  if (error) {
    errorElement.textContent = error;
    return;
  }
  const now = new Date().toISOString();
  if (values.id) {
    const existing = state.tasks.find((task) => task.id === values.id);
    if (!existing) {
      errorElement.textContent = "Seda ülesannet enam ei leitud. Palun sulge aken ja proovi uuesti.";
      return;
    }
    Object.assign(existing, values, { updatedAt: now });
  } else {
    state.tasks.push({ ...values, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, completed: false, createdAt: now });
  }
  document.querySelector("#task-dialog").close();
  renderAll();
  persist(values.id ? "Ülesannet uuendati." : "Ülesanne lisati.");
}

function handleTaskAction(action, id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) {
    toast("Ülesannet ei leitud.", true);
    return;
  }
  if (action === "edit-task") {
    openTaskDialog(task);
  } else if (action === "delete-task") {
    if (!window.confirm(`Kas soovid ülesande „${task.title}” kustutada?`)) return;
    state.tasks = state.tasks.filter((item) => item.id !== id);
    renderAll();
    persist("Ülesanne kustutati.");
  } else if (action === "toggle-task") {
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    renderAll();
    persist(task.completed ? "Tubli! Ülesanne märgiti lõpetatuks." : "Ülesanne märgiti tegemata ülesandeks.");
  }
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      event.preventDefault();
      navigateTo(pageButton.dataset.page);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const { action, id } = actionButton.dataset;
      if (action === "new-task") openTaskDialog();
      else if (action === "close-dialog") document.querySelector("#task-dialog").close();
      else if (action === "edit-task" || action === "delete-task") handleTaskAction(action, id);
      else if (action === "start-focus") {
        navigateTo("pomodoro");
        startFocus();
      }
    }
    const calendarControl = event.target.closest("[data-calendar]");
    if (calendarControl) moveCalendar(calendarControl.dataset.calendar, state.tasks);
    const modeButton = event.target.closest("[data-calendar-mode]");
    if (modeButton) setCalendarMode(modeButton.dataset.calendarMode, state.tasks);
    const dayButton = event.target.closest("[data-date]");
    if (dayButton) selectCalendarDate(dayButton.dataset.date, state.tasks);
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      taskFilter = filterButton.dataset.filter;
      renderTasks();
    }
  });

  document.querySelector("#task-list").addEventListener("change", (event) => {
    const checkbox = event.target.closest('[data-action="toggle-task"]');
    if (checkbox) handleTaskAction("toggle-task", checkbox.dataset.id);
  });
  document.querySelector("#task-search").addEventListener("input", (event) => {
    searchQuery = event.target.value;
    renderTasks();
  });
  document.querySelector("#task-form").addEventListener("submit", handleTaskSubmit);
  document.querySelector("#name-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.preferences.name = document.querySelector("#display-name").value.trim().slice(0, 32);
    renderProfile();
    persist("Nimi salvestati.");
  });
  const toggleTheme = () => {
    setTheme(state.preferences.theme === "dark" ? "light" : "dark");
    persist("Kujunduseelistus salvestati.");
  };
  document.querySelector("#theme-toggle").addEventListener("click", toggleTheme);
  document.querySelector("#settings-theme").addEventListener("click", toggleTheme);
  document.querySelector("#mobile-menu").addEventListener("click", () => document.querySelector("#sidebar").classList.toggle("open"));
  document.querySelector("#clear-data").addEventListener("click", () => {
    if (!window.confirm("Kas oled kindel? Kõik sinu ülesanded ja statistika kustutatakse jäädavalt.")) return;
    try {
      clearData();
      state = structuredClone(EMPTY_DATA);
      setTheme("light");
      renderAll();
      navigateTo("dashboard");
      toast("Kõik andmed kustutati.");
    } catch (error) {
      console.error("ÕpiPlaan ei saanud andmeid kustutada.", error);
      toast("Andmete kustutamine ebaõnnestus.", true);
    }
  });
  document.querySelector("#task-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
}

function init() {
  try {
    state = loadData();
  } catch (error) {
    console.error("ÕpiPlaan ei saanud salvestatud andmeid lugeda.", error);
    state = structuredClone(EMPTY_DATA);
    toast("Salvestatud andmeid ei saanud lugeda. Vanad andmed jäid muutmata.", true);
  }
  document.querySelector("#top-date").textContent = new Intl.DateTimeFormat("et-EE", { day: "numeric", month: "short" }).format(new Date());
  document.querySelector("#today-long").textContent = FULL_DATE.format(new Date());
  setTheme(state.preferences.theme);
  bindEvents();
  initPomodoro(() => {
    state.focusSessions.push({ completedAt: new Date().toISOString(), minutes: 25 });
    renderPomodoroStats();
    renderProgress();
    persist("Fookusring lõpetatud — tubli töö!");
  });
  renderAll();
}

init();
