# Little Things

A calm, responsive to-do list for keeping track of what matters. Tasks are saved in your browser, so your list is still there when you come back.

## Features

- Add, complete, and delete tasks
- Filter the list by all, in-progress, or completed tasks
- Clear completed tasks in one action
- Persist tasks in browser `localStorage`
- Schedule task reminders with in-app alerts and optional browser notifications
- Keyboard-accessible controls and responsive layout

## Getting started

You'll need Node.js 18 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create and preview a production build:

```sh
npm run build
npm run preview
```

## Reminders

Choose a future date and time in the **Remind me** field when adding a task.
Allow browser notifications to receive an operating-system alert. If notifications
are unavailable or blocked, the app shows an in-page reminder instead. Since this
is a static site with no push-notification server, the app must remain open for
scheduled reminders to fire.

## Deployment

Every push to `main` builds and deploys the site to GitHub Pages. The deployment
workflow is also available to run manually from the repository's Actions tab.
