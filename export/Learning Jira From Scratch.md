* * *

## title: "Learning Jira From Scratch" description: "A front-to-back, hands-on lab where I learn Jira well enough to actually use it — spaces, work items, boards, sprints, JQL, dashboards, automation, and admin." pubDate: 2026-06-26 draft: true tags: \["jira", "lab", "project-management", "atlassian", "tools"\]

## Why I'm doing this

I keep running into Jira. It's on job descriptions, it's what real teams run their work on, and I've been poking at Jira Service Management for the IT-support side of things. But I realized I'd never actually *learned Jira* — I'd just clicked around until something worked. This lab fixes that. By the end I want to be able to walk into any Jira space and know what I'm looking at, create and track work, run a sprint, search with JQL, build a dashboard, and set up a basic automation — without Googling every button.

This is written so anyone following along gets the same. No security focus, no agile dogma — just Jira itself.

**Time:** ~3–4 hours, doable in one sitting or split across a few. Every module has a checkpoint so you know you got it right.

**Cost:** \$0. The Jira Free plan covers everything here (up to 10 users, which is plenty for learning solo).

* * *

## A note on the words before we start

Atlassian renamed two core things in 2025, and the rename is fully live now. If a tutorial or screenshot you find online uses the old word, it's the same thing:

| What you'll see today (UI) | The old word (still in JQL, APIs, old docs) |
| --- | --- |
| **Space** | Project |
| **Work item** (or just "Work") | Issue |
| **Work type** | Issue type |

The reason this matters: the *interface* says "Space" and "Work item," but **JQL, the REST API, and roughly 90% of the tutorials on the internet still say "project" and "issue."** Both are correct. I'll use the new words and point out the old ones whenever they'd bite you. Don't let it throw you — it tripped me up for the first ten minutes and then I stopped noticing.

* * *

## Module 0 — Get a Jira and look around

### 0.1 Create a free site

1.  Go to `https://www.atlassian.com/software/jira` and start the free signup.
2.  Sign up with an email (or Google account). You'll pick a **site name** — this becomes your URL, like `yourname.atlassian.net`. This site is yours; it can hold many spaces.
3.  When it asks what you want to do first, let it walk you into creating a sample space, or skip it — we'll build our own in Module 2.

**Checkpoint:** You're staring at a Jira site at `something.atlassian.net`. There's a left sidebar and a top bar. Don't create anything yet — just get oriented.

### 0.2 The lay of the land

Take 5 minutes and find these. I literally pointed at each one until I had them straight:

- **Top bar:** the **Create** button (big and blue — this makes a work item from anywhere), global **Search**, your profile/avatar, and notifications (the bell).
- **Left sidebar:** **For you** / **Recent** / **Starred**, a list of your **Spaces**, and a **Filters** and **Dashboards** area. The sidebar is your home base.
- **App switcher** (the grid icon, top-left): Jira lives next to Confluence, Jira Service Management, etc. We're staying in Jira.

**Checkpoint:** You can find the Create button, global search, and your space list without hunting. That's the whole frame; everything else lives inside it.

* * *

## Module 1 — The mental model (read this once, it makes everything click)

Before touching anything, here's the model I wish someone had handed me. Jira is basically four nested ideas:

1.  **A Space** is a container for one team's or one project's work. (Old word: project.) Your wedding planning could be a space. A software product could be a space. Each space has its own board, its own settings, its own work.
    
2.  **A Work item** is a single unit of work inside a space. (Old word: issue.) "Fix the login bug." "Book the caterer." "Write the onboarding doc." Each one has an ID like `WED-14` (space key + number) and moves through a lifecycle from *to do* to *done*.
    
3.  **A Work type** tells Jira what *kind* of work item it is, which changes what fields it has and how it behaves. The common ones:
    
    - **Epic** — a big chunk of work that contains other items. ("Launch the new website.")
    - **Story** — a unit of user-facing value. ("As a visitor I can submit the contact form.")
    - **Task** — a plain to-do that isn't framed as a story. ("Renew the domain.")
    - **Bug** — something broken that needs fixing.
    - **Subtask** — a small piece *inside* a story/task/bug.
    
    The default hierarchy is: **Epic → Story / Task / Bug → Subtask.**
    
4.  **A Workflow** is the set of statuses a work item moves through, and the allowed moves between them. The simplest is **To Do → In Progress → Done**. A **board** is just a visual view of that workflow — each column is a status, each card is a work item.
    

That's the whole engine. Spaces hold work items; work items have a type and move through a workflow; the board shows you the workflow. Everything else — sprints, JQL, dashboards — is built on top of these four.

### One fork in the road: team-managed vs company-managed

When you create a space, Jira asks (or decides for you) between two flavors. This matters:

- **Team-managed** (old word: next-gen): self-contained. *You* set it up — work types, statuses, fields — with simple toggles, no Jira admin required. The config doesn't affect any other space. **This is what we'll use for learning,** because you control everything and can't break anyone else's setup.
- **Company-managed** (old word: classic): configured by a Jira admin using shared **schemes** and **screens** that many spaces reuse. More powerful and standardized for big orgs, more complex to touch. We'll peek at it in Module 10 so you recognize it, but we won't live there.

If you remember one sentence: *team-managed is a sandbox you fully control; company-managed is a shared standard.*

**Checkpoint:** Without scrolling up, say out loud what a space, a work item, a work type, and a workflow are. If you can, you're ready to build.

* * *

## Module 2 — Create your first space

We'll make a **team-managed Kanban** space. I'm theming mine around a small real project so it doesn't feel abstract — I'm using "redesign my personal site," but use anything: planning a trip, a move, a garden, whatever. The point is to track real-ish work.

1.  In the sidebar, click the **+** next to your spaces (or **Create space** / **Create project**).
2.  Pick a **template**. Choose **Kanban** under Software (Kanban = continuous flow, no sprints — the simplest place to start). We'll do Scrum in Module 5.
3.  When prompted, choose **Team-managed**.
4.  Name it (e.g., "Site Redesign") and accept or edit the **key** — that short prefix like `SITE` that prefixes every work item ID (`SITE-1`, `SITE-2`...). Create it.

You'll land on an empty **board**.

### Tour the space sidebar

Inside the space, the sidebar now shows that space's tools. On a team-managed Kanban space you'll typically see:

- **Board** — the columns view.
- **List** — a spreadsheet-style view of the same work items.
- **Calendar** — work items by due date.
- **Timeline** (a.k.a. roadmap) — epics laid out over time.
- **Summary** — a quick stats overview.
- **Space settings** (down at the bottom) — where you toggle features and edit work types/workflow.

**Checkpoint:** You have an empty board with named columns (probably **To Do / In Progress / Done**) and a sidebar full of views. Nothing's in it yet — that's next.

* * *

## Module 3 — Work items (the core skill)

This is the module that matters most. If you only learn one thing in Jira, learn to create and drive work items.

### 3.1 Create a few

Use the big **Create** button (top bar) or **\+ Create** on the board. Make these, picking the work type from the dropdown:

- **Task:** "Renew domain registration"
- **Story:** "Visitors can submit the contact form"
- **Bug:** "Mobile nav menu doesn't close after tapping a link"

For each, you set at minimum a **Summary** (the title). Hit Create. Watch them appear in the **To Do** column with IDs like `SITE-1`, `SITE-2`, `SITE-3`.

### 3.2 Anatomy of a work item

Click any work item to open it. This detail view is where the real work happens. Walk through the fields — I'll tell you what each one actually does:

- **Summary** — the title. Keep it a clear, specific action.
- **Description** — the body. Supports rich text, checklists, code blocks, links, images. Put the real detail here.
- **Status** — where it is in the workflow (To Do / In Progress / Done). You can change it here *or* by dragging on the board; same thing.
- **Assignee** — the one person responsible for moving it. (Assign it to yourself to feel it.)
- **Reporter** — who created/raised it. Defaults to you.
- **Priority** — Highest → Lowest. Just a label for sorting and triage; it doesn't *do* anything automatic.
- **Labels** — free-form tags you invent (`design`, `quick-win`). Great for slicing later with filters.
- **Due date** — feeds the Calendar view.
- **Parent** — link it to an epic (Module 6).
- **Comments** — the conversation log. Use **@name** to mention someone (they get notified). This is how teams actually communicate on a piece of work.
- **Attachments** — drag a file in.
- **Activity / History** — every change is logged. Nothing is silently lost; you can always see who changed what.

Do this now so it's muscle memory: open `SITE-1`, write a real description, set priority to **Medium**, add a label `admin`, assign it to yourself, and post a comment with an @mention of yourself.

### 3.3 Subtasks

Open the Story (`SITE-2`). Find **Add a child** / **Create subtask**. Add two:

- "Build the form UI"
- "Wire up form submission + validation"

Subtasks let you break one item into checkable pieces without cluttering the board. The parent shows a little progress indicator as subtasks complete.

### 3.4 Linking work items (relationships, not hierarchy)

Subtasks are *hierarchy* (parent/child). **Links** are *relationships* between peers. On the Bug (`SITE-3`), find **Link** and link it as **blocks** → the Story, or **relates to** the Task. Common link types:

- **blocks / is blocked by** — dependency.
- **relates to** — loose connection.
- **duplicates / is duplicated by** — for dupes.
- **clones** — copy lineage.

Links are how you express "this can't ship until that's done" across a project.

**Checkpoint:** You have at least three work items of different types, one with a real description + assignee + label + comment, one story with two subtasks, and one link between two items. You now know 80% of what daily Jira use actually is.

* * *

## Module 4 — The board (Kanban)

The board is the team's shared picture of "where is everything right now."

### 4.1 Move work across it

Drag `SITE-1` from **To Do** into **In Progress**, then into **Done**. Dragging a card changes its **status** — the board *is* the workflow. Open the item afterward and confirm the status changed there too. (Board and detail view are two windows onto the same data.)

### 4.2 Columns map to statuses

In team-managed spaces you can edit columns directly: hover a column header for options, or go to **Space settings → Board** to add a column like **In Review** between In Progress and Done. Add it, then drag a card into it. You just edited a workflow without touching any admin scheme — that's the team-managed superpower.

### 4.3 Quick filters and swimlanes

- **Quick filters** (top of the board): one-click filters like "Only my items" or "Only `design` labels." Try filtering to a label you added.
- **Swimlanes:** horizontal lanes that group cards — commonly by **assignee** or **epic**. Turn on swimlanes by assignee in board settings and watch the board reorganize.
- **WIP limits:** set a max number of cards per column (e.g., In Progress ≤ 3) to stop yourself from starting more than you finish. The column turns red when you exceed it. This is the core discipline Kanban is *for*.

**Checkpoint:** You moved an item to Done by dragging, added an "In Review" column, and tried at least one quick filter. The board no longer feels like a mystery — it's just your workflow, sideways.

* * *

## Module 5 — Scrum: backlog, sprints, estimation

Kanban is continuous flow. **Scrum** works in fixed timeboxes called **sprints** (usually 1–2 weeks) where you commit to a set of work up front. Most engineering teams run Scrum, so you need to know it.

You can either create a new **Scrum** space (Create → Scrum template → team-managed) or enable sprints on your current space. I'd make a fresh Scrum space called "Site Sprint" so you can compare the two side by side. If you'd rather convert the existing one: **Space settings → Features** and toggle on **Backlog** and **Sprints**.

### 5.1 The backlog

A **Scrum** space adds a **Backlog** view in the sidebar. The backlog is your prioritized waiting list — everything you *might* do, ranked, above the line of what you're doing *now*.

1.  Go to **Backlog**.
2.  Create 6–8 work items right in the backlog (stories and tasks for your project). Use **\+ Create** at the bottom of the Backlog list.
3.  **Rank them:** drag to reorder. Top = most important. Ranking *is* prioritization in Jira.

### 5.2 Estimation with story points

Teams estimate effort so they can plan how much fits in a sprint. The usual unit is **story points** — a relative size, not hours. (A 1 is trivial; an 8 is big and scary.)

1.  Make sure estimation is on: **Space settings → Features → Estimation** (story points).
2.  On each backlog item, set a **story point estimate** (try the field on the item or inline on the backlog). Use small numbers: 1, 2, 3, 5, 8.

### 5.3 Plan and run a sprint

1.  In the Backlog, there's a **Sprint** section above the backlog list (or a **Create sprint** button). Create a sprint.
2.  Drag your top 3–4 items from the backlog up into the sprint. Watch the sprint's total story points add up.
3.  Click **Start sprint**. Set a **goal** ("Ship the contact form") and a length (2 weeks). Start it.
4.  Now go to the **Board** — it only shows the *active sprint's* items. Drag them through To Do → In Progress → Done as you "work."

### 5.4 See the burndown

Once a sprint is running, the space's **Reports** show a **Burndown chart** — remaining work vs. time. As you mark items Done, the line drops toward zero. This is the single most-looked-at chart in Scrum; now you know what it means.

When the sprint ends, you **Complete sprint** — finished items leave, unfinished ones roll back to the backlog or into the next sprint. That loop (plan → sprint → review → repeat) is all Scrum is.

**Checkpoint:** You have a started sprint with a goal, a few estimated items moving across the board, and you've looked at the burndown. You can now hold your own in a sprint planning meeting.

* * *

## Module 6 — Epics and organizing bigger work

So far everything's been flat. **Epics** group related work items under one umbrella so you can track a large initiative.

1.  Create a work item with type **Epic**: "Contact form feature."
2.  Open a couple of your stories/tasks and set their **Parent** to that epic (or, in the Backlog, use the epic panel to drag items under it).
3.  Open the **Timeline** (roadmap) view in the sidebar. Your epic appears as a bar you can stretch across weeks/months, with its child items rolled up underneath.

The hierarchy you're now using: **Epic → Story/Task/Bug → Subtask.** That's the default ceiling on Free/Standard. (Higher levels like *Initiative* above Epic exist only with the Premium "plans"/Advanced Roadmaps tier — good to know it exists, not needed here.)

**Checkpoint:** One epic with at least two children, visible as a bar on the Timeline. You can now describe big work without losing the small pieces inside it.

* * *

## Module 7 — Searching and JQL (this is the real power tool)

Clicking around is fine for 10 items. The moment a real space has hundreds, **search** is how you survive. And JQL is what separates people who *use* Jira from people who *run* on it.

### 7.1 Basic search

Hit the global **Search** in the top bar. Type text — it matches summaries and descriptions across spaces. Fine for "where's that login thing." Now let's go up a level.

### 7.2 JQL — Jira Query Language

Open **Filters → View all work items** (or **Advanced search**), and switch the search to **JQL**. JQL is a simple, readable query language: `field operator value`, combined with `AND` / `OR` / `ORDER BY`. Try these one at a time and watch the results change:

```jql
project = "SITE"
```

```jql
project = "SITE" AND status = "In Progress"
```

```jql
assignee = currentUser() AND status != Done
```

```jql
project = "SITE" AND labels = design ORDER BY priority DESC
```

```jql
created >= -7d ORDER BY created DESC
```

**The gotcha I promised you:** notice JQL says `project` and the underlying field is still `issue`\-based — JQL did **not** get renamed to "space" and "work item." The UI says Space/Work item; **JQL still speaks the old language.** This is the single most useful thing to remember from the whole lab. Everything you read about JQL online still works.

A few operators worth knowing: `=`, `!=`, `>`, `<`, `>=`, `IN (a, b)`, `~` (contains text), `IS EMPTY`, `WAS` / `CHANGED` (history-based). And functions like `currentUser()`, `startOfWeek()`, `now()`.

### 7.3 Save it as a filter

Build a query you'd reuse — say `assignee = currentUser() AND status != Done ORDER BY priority DESC` ("my open work, most urgent first") — and **Save** it as a filter. Saved filters show up in your sidebar, can power dashboards (next module), and can be shared with a team. I now keep a "my open work" filter pinned and it's the first thing I check each day.

**Checkpoint:** You ran at least three JQL queries, understand that JQL uses `project`/`issue` not `space`/`work item`, and saved one filter. This is the skill that makes you look fluent.

* * *

## Module 8 — Dashboards and reports

A **dashboard** is a customizable page of widgets ("gadgets"), usually driven by your saved filters. It's your at-a-glance command center.

1.  Sidebar → **Dashboards → Create dashboard.** Name it.
2.  **Add a gadget.** Good starter gadgets:
    - **Filter Results** — a table of items from a saved filter (point it at your "my open work" filter).
    - **Pie Chart** — break a filter down by a field (e.g., by status or assignee).
    - **Created vs Resolved** — are you closing work faster than it arrives?
    - **Assigned to Me** — exactly what it says.
3.  Arrange and resize. You can have several dashboards and set one as your default landing page.

Separately, each space has built-in **Reports** (in the sidebar). Beyond the Scrum burndown, look at:

- **Velocity** (Scrum) — points completed per sprint over time; how you forecast.
- **Cumulative flow** (Kanban) — work in each status over time; reveals bottlenecks.

**Checkpoint:** A dashboard with at least two gadgets, one fed by your saved filter. You can now answer "how's the project doing?" with a glance instead of a guess.

* * *

## Module 9 — Automation (no code)

Jira can react to events with rules — **when X happens, do Y** — and you build them with dropdowns, no scripting. This is where Jira starts saving you real time.

1.  **Space settings → Automation** (team-managed) → **Create rule**.
2.  **Trigger:** "When work item transitioned to **Done**."
3.  **Action:** "Add comment" → text like "Closed out — nice." (Or "Assign to reporter," or "Edit field.")
4.  Turn it on, then drag a real item to Done and watch the comment appear automatically.

A couple of genuinely useful real rules to try next:

- When an item is created with priority **Highest**, **assign it to me** and add a comment.
- When a parent's subtasks are all Done, transition the parent to Done.
- On a schedule (e.g., every Monday 9am), comment on stale items that haven't moved in 7 days (`status CHANGED` JQL inside the rule).

Automation rules have run logs so you can see what fired and debug. Free plans have a monthly limit on rule runs, but it's far more than you'll hit learning.

**Checkpoint:** One working rule that fires when you move an item to Done. You've now used the feature most people don't even know is there.

* * *

## Module 10 — Admin and the company-managed world

You don't need to be an admin to *use* Jira, but knowing where the levers are makes the whole thing legible.

### 10.1 People and access

- **Invite users:** top bar → your space → **Add people**, or site **Settings → User management**. Invite a throwaway second email to feel multi-user (assigning, mentioning).
- **Roles (team-managed):** **Space settings → Access.** Roles like **Admin / Member / Viewer** control who can configure vs. just work.

### 10.2 Customize the space itself (team-managed, you can do this)

In **Space settings**:

- **Work types** — add a custom type ("Chore"), give it an icon, choose its fields. This is the thing that used to require an admin and a "scheme"; team-managed lets you just do it.
- **Workflow** — for a given work type, edit the statuses and the allowed transitions between them in a simple visual editor. Add a "Blocked" status, allow In Progress → Blocked → In Progress.
- **Fields** — add or hide fields on the create/edit screen.
- **Notifications** — control what emails go out.

### 10.3 What company-managed looks like (so you recognize it)

Create one company-managed space (Create → choose **Company-managed**) and open its settings. Notice it doesn't let you toggle simple features — instead it references shared **schemes** (workflow scheme, permission scheme, notification scheme) and **screens** that are configured globally under the site's **Jira settings** (the gear icon → Issues/Work items). One admin defines a workflow once; every company-managed space using that scheme inherits it. That's the trade: **standardization and scale, at the cost of simplicity.** You now understand both halves of Jira's world.

**Checkpoint:** You added a custom work type and a "Blocked" status in your team-managed space, and you've seen — and can identify — a company-managed space and its schemes.

* * *

## Module 11 — Capstone: run a real mini-project end to end

Tie it all together. Pick a small real thing (a trip, an event, a build, a study plan). Then, using only what you learned:

1.  **Create a team-managed Scrum space** for it, with a sensible key.
2.  **Build a backlog** of 10–12 work items: a couple of **epics**, several **stories/tasks** parented under them, at least one **bug**, and a couple of **subtasks**.
3.  **Estimate** everything in story points and **rank** the backlog.
4.  **Add labels** so you can slice it later (`urgent`, `nice-to-have`).
5.  **Plan and start a 1-week sprint** with a written **goal**, pulling the top items in.
6.  **Work the board:** move items across, leave a real comment with an @mention, mark some Done. Check the **burndown**.
7.  **Write one JQL filter** for "my unfinished work, highest priority first" and **save** it.
8.  **Build a dashboard** with that filter as a Filter Results gadget plus a pie chart by status.
9.  **Add one automation rule** ("when moved to Done, comment").
10. **Complete the sprint** and notice where unfinished work goes.

If you can do all ten without scrolling back up, you understand Jira well enough to use it on a real team. That was the whole goal.

* * *

## Glossary (and old-word decoder ring)

| Term | What it is | Old word |
| --- | --- | --- |
| **Space** | Container for a team's/project's work | Project |
| **Work item** | A single unit of work (`KEY-123`) | Issue |
| **Work type** | The kind of work item (epic/story/task/bug/subtask) | Issue type |
| **Workflow** | The statuses an item moves through + allowed transitions | (same) |
| **Board** | Visual view of the workflow; columns = statuses | (same) |
| **Backlog** | Prioritized list of not-yet-started work | (same) |
| **Sprint** | Fixed timebox (1–2 wks) of committed work | (same) |
| **Epic** | Big item that contains stories/tasks | (same) |
| **Story point** | Relative effort estimate (1,2,3,5,8…) | (same) |
| **JQL** | Query language for finding work items — *still uses `project`/`issue`* | (same) |
| **Filter** | A saved JQL query | (same) |
| **Gadget** | A widget on a dashboard | (same) |
| **Team-managed** | Self-serve space you fully control | Next-gen |
| **Company-managed** | Admin-configured space using shared schemes | Classic |
| **Scheme** | Reusable config (workflow/permissions/notifications) shared across company-managed spaces | (same) |

## Things that confused me, so they don't confuse you

- **The board and the detail view are the same data.** Changing status in one changes it in the other. They're two windows, not two records.
- **Priority and labels don't *do* anything by themselves.** They're for sorting, filtering, and triage. The power comes when you query or automate on them.
- **Subtasks are hierarchy; links are relationships.** Don't reach for a subtask when you mean "this blocks that."
- **Story points are relative, not hours.** Resist converting them to time. A 5 is "about five-ish times a 1," and that's enough to plan with.
- **JQL kept the old vocabulary.** When the UI and the query language disagree on a word, the query language is using the old one. This is the #1 gotcha and now you'll never fall for it.

## Where to go next

- **JQL deep-dive:** learn `WAS`, `CHANGED`, and the date functions — they unlock reporting on *history*, not just current state.
- **Confluence:** Atlassian's wiki, tightly linked to Jira (link a doc to an epic). Worth a look if you're documenting anything.
- **Jira Service Management:** the same engine pointed at IT/help-desk work — queues, SLAs, request forms, a customer portal. If you've done this lab, JSM will feel like Jira with a service desk bolted on, because that's exactly what it is.
- **The REST API:** once you're comfortable, automating Jira from a script is a natural homelab-flavored next step (and yes — the API also still says `issue`).