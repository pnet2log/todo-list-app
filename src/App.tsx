import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  remindAt?: number;
  reminded?: boolean;
};

type Filter = "all" | "active" | "completed";

const STORAGE_KEY = "little-things.tasks";
const REMINDER_CHECK_INTERVAL = 15_000;

function localDateTimeValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function readTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (task): task is Task =>
        typeof task === "object" &&
        task !== null &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.completed === "boolean" &&
        typeof task.createdAt === "number" &&
        (!("remindAt" in task) || typeof task.remindAt === "number") &&
        (!("reminded" in task) || typeof task.reminded === "boolean"),
    );
  } catch {
    return [];
  }
}

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function App() {
  const [tasks, setTasks] = useState<Task[]>(readTasks);
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [reminderTime, setReminderTime] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const [permissionMessage, setPermissionMessage] = useState("");
  const [reminderAlerts, setReminderAlerts] = useState<Task[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (!tasks.some((task) => !task.completed && task.remindAt && !task.reminded)) {
      return;
    }

    const checkReminders = () => {
      const dueTasks = tasks.filter(
        (task) =>
          !task.completed &&
          task.remindAt !== undefined &&
          task.remindAt <= Date.now() &&
          !task.reminded,
      );
      if (dueTasks.length === 0) return;

      const dueIds = new Set(dueTasks.map((task) => task.id));
      setTasks((current) =>
        current.map((task) =>
          dueIds.has(task.id) ? { ...task, reminded: true } : task,
        ),
      );
      setReminderAlerts((current) => [...current, ...dueTasks]);

      if (notificationPermission === "granted") {
        for (const task of dueTasks) {
          try {
            const notification = new Notification("A little reminder", {
              body: task.title,
              tag: task.id,
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (error) {
            console.error("Could not display task reminder notification.", error);
          }
        }
      }
    };

    const intervalId = window.setInterval(checkReminders, REMINDER_CHECK_INTERVAL);
    checkReminders();
    return () => window.clearInterval(intervalId);
  }, [notificationPermission, tasks]);

  const remaining = tasks.filter((task) => !task.completed).length;
  const completed = tasks.length - remaining;
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (filter === "active") return !task.completed;
        if (filter === "completed") return task.completed;
        return true;
      }),
    [filter, tasks],
  );

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    const remindAt = reminderTime ? new Date(reminderTime).getTime() : undefined;
    if (remindAt !== undefined && (!Number.isFinite(remindAt) || remindAt <= Date.now())) {
      setFormMessage("Choose a reminder time in the future.");
      return;
    }
    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        title,
        completed: false,
        createdAt: Date.now(),
        ...(remindAt !== undefined ? { remindAt } : {}),
      },
      ...current,
    ]);
    setNewTask("");
    setReminderTime("");
    setFormMessage("");
  }

  async function enableNotifications() {
    if (notificationPermission === "unsupported") return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setPermissionMessage(
        permission === "granted"
          ? "Browser reminders are enabled."
          : "Browser alerts were not enabled. In-app reminders still work while this page is open.",
      );
    } catch (error) {
      console.error("Could not request browser notification permission.", error);
      setPermissionMessage(
        "Browser notifications could not be enabled. In-app reminders still work while this page is open.",
      );
    }
  }

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function clearCompleted() {
    setTasks((current) => current.filter((task) => !task.completed));
  }

  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#" aria-label="Little Things home">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span>little things</span>
        </a>
        <span className="date-label">{dateLabel}</span>
      </header>

      <section className="todo-card" aria-labelledby="page-title">
        <div className="intro">
          <p className="eyebrow">A little progress adds up</p>
          <h1 id="page-title">Make room for<br /><span>what matters.</span></h1>
          <p className="intro-copy">One thing at a time. You&apos;ve got this.</p>
        </div>

        <form className="add-form" onSubmit={addTask}>
          <label className="visually-hidden" htmlFor="new-task">Add a task</label>
          <span className="input-sparkle" aria-hidden="true">✦</span>
          <input
            id="new-task"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="What would you like to do?"
            maxLength={160}
            autoComplete="off"
          />
          <button className="add-button" type="submit" disabled={!newTask.trim()}>
            <span aria-hidden="true">+</span>
            <span className="button-label">Add task</span>
          </button>
        </form>
        <div className="reminder-settings">
          <label className="reminder-field" htmlFor="reminder-time">
            <span className="reminder-label">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="7.1" />
                <path d="M10 5.8v4.6l3 1.8" />
              </svg>
              Remind me
            </span>
            <input
              id="reminder-time"
              type="datetime-local"
              value={reminderTime}
              min={localDateTimeValue(new Date())}
              onChange={(event) => {
                setReminderTime(event.target.value);
                setFormMessage("");
              }}
            />
          </label>
          {notificationPermission === "default" && (
            <button
              className="enable-notifications"
              type="button"
              onClick={enableNotifications}
            >
              Enable browser alerts
            </button>
          )}
          <span className="notification-status" aria-live="polite">
            {permissionMessage ||
              (notificationPermission === "granted"
                ? "Browser alerts on"
                : notificationPermission === "denied"
                  ? "In-app reminders only · browser alerts blocked"
                  : notificationPermission === "unsupported"
                    ? "In-app reminders only"
                    : "Keep this page open for reminders")}
          </span>
        </div>
        {formMessage && <p className="form-message" role="alert">{formMessage}</p>}

        <div className="list-toolbar">
          <div className="filters" aria-label="Filter tasks">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`filter-button${filter === item.id ? " selected" : ""}`}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {item.id === "all" && <span className="filter-count">{tasks.length}</span>}
              </button>
            ))}
          </div>
          <span className="task-count" aria-live="polite">
            {remaining} {remaining === 1 ? "thing" : "things"} to do
          </span>
        </div>

        {visibleTasks.length > 0 ? (
          <ul className="task-list" aria-label="Your tasks">
            {visibleTasks.map((task, index) => (
              <li className={`task-row${task.completed ? " is-complete" : ""}`} key={task.id}>
                <button
                  type="button"
                  className="check-button"
                  aria-label={task.completed ? `Mark ${task.title} as in progress` : `Complete ${task.title}`}
                  aria-pressed={task.completed}
                  onClick={() => toggleTask(task.id)}
                >
                  {task.completed && <span aria-hidden="true">✓</span>}
                </button>
                <span className="task-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="task-description">
                  <span className="task-title">{task.title}</span>
                  {task.remindAt !== undefined && (
                    <span className="task-reminder">
                      {task.reminded ? "Reminder sent" : "Reminder"} ·{" "}
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(task.remindAt)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="delete-button"
                  aria-label={`Delete ${task.title}`}
                  onClick={() => deleteTask(task.id)}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M4.5 6h11M8 6V4.5h4V6m2.5 0-.6 9.2H6.1L5.5 6m3 2.5v4m3-4v4" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <div className="empty-illustration" aria-hidden="true">
              <span className="empty-sun">✳</span>
              <span className="empty-basket">
                <span className="basket-leaf leaf-one">⌁</span>
                <span className="basket-leaf leaf-two">⌁</span>
              </span>
            </div>
            <h2>
              {filter === "completed"
                ? "Nothing checked off just yet"
                : filter === "active" && tasks.length > 0
                  ? "All caught up!"
                  : "Your list is a blank canvas"}
            </h2>
            <p>
              {filter === "completed"
                ? "Complete a task and it will find its way here."
                : filter === "active" && tasks.length > 0
                  ? "You did everything on your list. Take a breather."
                  : "Add a small thing you want to get done today."}
            </p>
          </div>
        )}

        {tasks.length > 0 && (
          <footer className="list-footer">
            <span>
              {completed > 0
                ? `${completed} ${completed === 1 ? "little win" : "little wins"} today`
                : "Small steps still move you forward"}
              {completed > 0 && <span className="win-sparkle" aria-hidden="true"> ✨</span>}
            </span>
            {completed > 0 && (
              <button type="button" className="clear-button" onClick={clearCompleted}>
                Clear completed
              </button>
            )}
          </footer>
        )}
      </section>

      {reminderAlerts.length > 0 && (
        <div className="reminder-alerts" role="status" aria-live="polite">
          {reminderAlerts.map((task) => (
            <div className="reminder-alert" key={task.id}>
              <span className="alert-icon" aria-hidden="true">✳</span>
              <span><strong>Reminder</strong>{task.title}</span>
              <button
                type="button"
                aria-label={`Dismiss reminder for ${task.title}`}
                onClick={() =>
                  setReminderAlerts((current) =>
                    current.filter((alert) => alert.id !== task.id),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="page-note"><span aria-hidden="true">☼</span> Be kind to yourself along the way.</p>
    </main>
  );
}

export default App;
