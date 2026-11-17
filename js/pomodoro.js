const MODES = {
  focus: { seconds: 25 * 60, label: "ÕPIAEG", status: "Valmis alustama?" },
  short: { seconds: 5 * 60, label: "LÜHIKE PAUS", status: "Aeg puhata." },
  long: { seconds: 15 * 60, label: "PIKK PAUS", status: "Võta hetk iseendale." }
};

const CIRCUMFERENCE = 2 * Math.PI * 118;
let mode = "focus";
let remaining = MODES.focus.seconds;
let deadline = 0;
let intervalId = null;
let onFocusComplete = () => {};

function playAlarm() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const context = new AudioContextClass();
    [0, 0.22, 0.44].forEach((delay) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.2);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.21);
    });
    window.setTimeout(() => context.close(), 1000);
  } catch (error) {
    console.warn("Helimärguannet ei saanud esitada.", error);
  }
}

function updateDisplay(status) {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  document.querySelector("#timer-display").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  document.querySelector("#timer-mode-label").textContent = MODES[mode].label;
  document.querySelector("#timer-status").textContent = status || (intervalId ? "Keskendu rahulikult." : MODES[mode].status);
  const progress = document.querySelector("#timer-progress");
  progress.style.strokeDasharray = String(CIRCUMFERENCE);
  progress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - remaining / MODES[mode].seconds));
  progress.classList.toggle("break-ring", mode !== "focus");
  document.querySelector("#timer-start").innerHTML = intervalId
    ? '<svg class="icon"><use href="#i-clock"/></svg>Paus'
    : '<svg class="icon"><use href="#i-clock"/></svg>Alusta';
  document.querySelectorAll("[data-timer-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.timerMode === mode);
  });
}

function tick() {
  remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  if (remaining === 0) {
    window.clearInterval(intervalId);
    intervalId = null;
    updateDisplay("Aeg sai täis!");
    playAlarm();
    if (mode === "focus") onFocusComplete();
    return;
  }
  updateDisplay();
}

function startTimer() {
  if (intervalId) return;
  if (remaining === 0) remaining = MODES[mode].seconds;
  deadline = Date.now() + remaining * 1000;
  intervalId = window.setInterval(tick, 250);
  updateDisplay();
}

export function startFocus() {
  if (intervalId) return;
  mode = "focus";
  remaining = MODES.focus.seconds;
  updateDisplay();
  startTimer();
}

export function initPomodoro(onComplete) {
  onFocusComplete = onComplete;
  updateDisplay();
  document.querySelector("#timer-start").addEventListener("click", () => {
    if (intervalId) {
      remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      window.clearInterval(intervalId);
      intervalId = null;
      updateDisplay("Taimer on pausil.");
      return;
    }
    startTimer();
  });

  document.querySelector("#timer-reset").addEventListener("click", () => {
    if (intervalId) window.clearInterval(intervalId);
    intervalId = null;
    remaining = MODES[mode].seconds;
    updateDisplay();
  });

  document.querySelectorAll("[data-timer-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      if (intervalId) window.clearInterval(intervalId);
      intervalId = null;
      mode = button.dataset.timerMode;
      remaining = MODES[mode].seconds;
      updateDisplay();
    });
  });
}
