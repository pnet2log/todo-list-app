import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

type Filter = "all" | "active" | "completed";

const STORAGE_KEY = "little-things.tasks";

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
        typeof task.createdAt === "number",
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

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
    setTasks((current) => [
      { id: crypto.randomUUID(), title, completed: false, createdAt: Date.now() },
      ...current,
    ]);
    setNewTask("");
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
                <span className="task-title">{task.title}</span>
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

      <p className="page-note"><span aria-hidden="true">☼</span> Be kind to yourself along the way.</p>
    </main>
  );
}

export default App;
