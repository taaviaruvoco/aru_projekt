const PRIORITIES = {
  high: { label: "Kõrge", className: "high" },
  medium: { label: "Keskmine", className: "medium" },
  low: { label: "Madal", className: "low" }
};

const DATE_FORMAT = new Intl.DateTimeFormat("et-EE", { day: "numeric", month: "short" });

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dueLabel(date) {
  const today = localDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateString(tomorrowDate);
  if (date === today) return "Täna";
  if (date === tomorrow) return "Homme";
  return DATE_FORMAT.format(new Date(`${date}T12:00:00`));
}

function isOverdue(task) {
  return !task.completed && task.dueDate < localDateString();
}

export function renderTaskList(container, tasks, filter = "all", query = "") {
  const normalizedQuery = query.trim().toLocaleLowerCase("et");
  const shown = tasks.filter((task) => {
    const matchesFilter = filter === "all" || (filter === "active" && !task.completed) || (filter === "completed" && task.completed);
    const searchable = `${task.title} ${task.subject || ""} ${task.category || ""} ${task.description || ""}`.toLocaleLowerCase("et");
    return matchesFilter && searchable.includes(normalizedQuery);
  }).sort((a, b) => Number(a.completed) - Number(b.completed) || a.dueDate.localeCompare(b.dueDate));

  if (!shown.length) {
    const hasTasks = tasks.some((task) => filter === "all" || (filter === "active" && !task.completed) || (filter === "completed" && task.completed));
    container.innerHTML = `<div class="task-empty"><span class="empty-symbol"><svg class="icon"><use href="#i-check"/></svg></span><strong>${hasTasks ? "Otsingule ei leitud vasteid" : filter === "completed" ? "Veel pole midagi lõpetatud" : "Siin on praegu mõnusalt ruumi"}</strong><p>${hasTasks ? "Proovi mõnda teist otsingusõna." : filter === "completed" ? "Lõpetatud ülesanded ilmuvad siia." : "Lisa ülesanne ja tee esimene väike samm."}</p></div>`;
    return;
  }

  container.innerHTML = shown.map((task) => {
    const priority = PRIORITIES[task.priority] || PRIORITIES.medium;
    const overdue = isOverdue(task);
    return `<article class="task-row${task.completed ? " completed" : ""}">
      <input class="task-check" type="checkbox" data-action="toggle-task" data-id="${escapeHtml(task.id)}" ${task.completed ? "checked" : ""} aria-label="${task.completed ? "Märgi lõpetamata" : "Märgi lõpetatuks"}: ${escapeHtml(task.title)}">
      <div class="task-main"><div class="task-title-line"><span class="task-title">${escapeHtml(task.title)}</span><span class="priority-pill ${priority.className}">${priority.label}</span></div>
      <div class="task-meta">${task.subject ? `<span>${escapeHtml(task.subject)}</span>` : ""}<span class="category-pill">${escapeHtml(task.category || "Muu")}</span>${task.description ? `<span class="task-description">${escapeHtml(task.description)}</span>` : ""}</div></div>
      <span class="due-pill${overdue ? " overdue" : ""}">${overdue ? "Üle tähtaja · " : ""}${escapeHtml(dueLabel(task.dueDate))}</span>
      <div class="task-actions"><button class="icon-button" data-action="edit-task" data-id="${escapeHtml(task.id)}" aria-label="Muuda ülesannet ${escapeHtml(task.title)}"><svg class="icon"><use href="#i-edit"/></svg></button><button class="icon-button delete-task" data-action="delete-task" data-id="${escapeHtml(task.id)}" aria-label="Kustuta ülesanne ${escapeHtml(task.title)}"><svg class="icon"><use href="#i-trash"/></svg></button></div>
    </article>`;
  }).join("");
}

export function renderTaskPreviews(container, tasks, emptyText, limit = 5) {
  const items = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, limit);
  if (!items.length) {
    container.innerHTML = `<p class="empty-hint">${escapeHtml(emptyText)}</p>`;
    return;
  }
  container.innerHTML = items.map((task) => {
    const priority = PRIORITIES[task.priority] || PRIORITIES.medium;
    return `<div class="preview-task"><span class="preview-dot ${priority.className}"></span><span class="preview-info"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.subject || task.category || "Ülesanne")}</span></span><span class="preview-date">${escapeHtml(dueLabel(task.dueDate))}</span></div>`;
  }).join("");
}

export function getTaskFormValues(form) {
  const fields = new FormData(form);
  return {
    id: String(fields.get("id") || ""),
    title: String(fields.get("title") || "").trim(),
    subject: String(fields.get("subject") || "").trim(),
    dueDate: String(fields.get("dueDate") || ""),
    priority: String(fields.get("priority") || "medium"),
    category: String(fields.get("category") || "Muu"),
    description: String(fields.get("description") || "").trim()
  };
}

export function validateTask(task) {
  if (!task.title) return "Palun sisesta ülesande nimi.";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? new Date(`${task.dueDate}T12:00:00`) : null;
  if (!date || Number.isNaN(date.getTime()) || localDateString(date) !== task.dueDate) {
    return "Palun vali ülesandele kehtiv tähtaeg.";
  }
  if (!Object.hasOwn(PRIORITIES, task.priority)) return "Palun vali kehtiv prioriteet.";
  if (!["Kodutöö", "Kontrolltöö", "Õppimine", "Projekt", "Muu"].includes(task.category)) return "Palun vali kehtiv ülesande tüüp.";
  return "";
}
