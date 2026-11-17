import { localDateString, renderTaskPreviews } from "./tasks.js";

const MONTH_FORMAT = new Intl.DateTimeFormat("et-EE", { month: "long", year: "numeric" });
const FULL_DATE_FORMAT = new Intl.DateTimeFormat("et-EE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("et-EE", { weekday: "short" });
const WEEKDAYS = ["E", "T", "K", "N", "R", "L", "P"];

let currentDate = new Date();
let selectedDate = localDateString();
let mode = "month";

function dateString(date) {
  return localDateString(date);
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

function dayMarkup(date, tasks, options = {}) {
  const value = dateString(date);
  const dayTasks = tasks.filter((task) => task.dueDate === value);
  const classes = ["calendar-day"];
  if (value === localDateString()) classes.push("today");
  if (value === selectedDate) classes.push("selected");
  if (options.outside) classes.push("outside-month");
  if (mode === "week") classes.push("week-mode");
  if (mode === "day") classes.push("day-mode");
  return `<button type="button" class="${classes.join(" ")}" data-date="${value}" aria-label="${FULL_DATE_FORMAT.format(date)}, ${dayTasks.length} ülesannet"><span class="day-number">${date.getDate()}</span>${dayTasks.length ? `<span class="day-events">${dayTasks.slice(0, 3).map((task) => `<i class="day-event-dot${task.completed ? " done" : ""}"></i>`).join("")}${dayTasks.length > 3 ? `<span class="day-event-count">+${dayTasks.length - 3}</span>` : ""}</span>` : ""}</button>`;
}

function updateSelectedDay(tasks) {
  const selected = new Date(`${selectedDate}T12:00:00`);
  const heading = document.querySelector("#selected-day-heading");
  heading.textContent = FULL_DATE_FORMAT.format(selected);
  renderTaskPreviews(document.querySelector("#selected-day-tasks"), tasks.filter((task) => task.dueDate === selectedDate), "Selleks päevaks pole ülesandeid.", 10);
}

export function renderCalendar(tasks) {
  const heading = document.querySelector("#calendar-heading");
  const grid = document.querySelector("#calendar-grid");
  document.querySelectorAll("[data-calendar-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.calendarMode === mode);
  });

  if (mode === "day") {
    heading.textContent = FULL_DATE_FORMAT.format(currentDate);
    grid.innerHTML = `${WEEKDAYS.map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}${dayMarkup(currentDate, tasks)}`;
  } else if (mode === "week") {
    const start = startOfWeek(currentDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    heading.textContent = `${start.getDate()}. – ${new Intl.DateTimeFormat("et-EE", { day: "numeric", month: "long", year: "numeric" }).format(end)}`;
    grid.innerHTML = WEEKDAYS.map((day) => `<div class="calendar-weekday">${day}</div>`).join("") +
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return dayMarkup(date, tasks);
      }).join("");
  } else {
    heading.textContent = MONTH_FORMAT.format(currentDate);
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return dayMarkup(date, tasks, { outside: date.getMonth() !== currentDate.getMonth() });
    });
    grid.innerHTML = WEEKDAYS.map((day) => `<div class="calendar-weekday">${day}</div>`).join("") + days.join("");
  }
  updateSelectedDay(tasks);
}

export function setCalendarMode(nextMode, tasks) {
  if (!["day", "week", "month"].includes(nextMode)) return;
  mode = nextMode;
  renderCalendar(tasks);
}

export function moveCalendar(direction, tasks) {
  if (direction === "today") {
    currentDate = new Date();
    selectedDate = localDateString(currentDate);
  } else {
    const amount = direction === "next" ? 1 : -1;
    if (mode === "month") currentDate.setMonth(currentDate.getMonth() + amount);
    else if (mode === "week") currentDate.setDate(currentDate.getDate() + 7 * amount);
    else currentDate.setDate(currentDate.getDate() + amount);
  }
  renderCalendar(tasks);
}

export function selectCalendarDate(value, tasks) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00`))) return;
  selectedDate = value;
  currentDate = new Date(`${value}T12:00:00`);
  renderCalendar(tasks);
}
