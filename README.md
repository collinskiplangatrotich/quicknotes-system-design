# QuickNotes System Architecture & API Client

![QuickNotes Project](https://img.shields.io/badge/System-Design%20%26%20REST%20API-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Complete-success?style=flat-square)

QuickNotes is a production-grade system prototype and architecture specification designed to scale a note-taking application from a browser-only client to an enterprise-level service capable of supporting **1,000,000 Daily Active Users (DAU)**.

---

## 📁 Repository Structure

```text
quicknotes-system-design/
├── index.html            # HTML5 Web Application Client
├── style.css             # Responsive Component Styles & Status Indicators
├── api.js                # Async REST Integration Engine (Fetch API)
├── docs/
│   ├── api-design.md     # Full REST API Endpoint Specification
│   ├── data-model.md     # SQL Relational Data Schemas & Queries
│   └── architecture.md   # System Architecture, Estimates & Sizing
└── README.md             # Overview Documentation
```

---

## 🚀 Running the API Client

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/your-username/quicknotes-system-design.git
   cd quicknotes-system-design
   ```

2. Open `index.html` directly in any modern web browser, or serve it using VS Code Live Server:
   ```bash
   # Using Python simple server (optional)
   python3 -m http.server 8000
   ```

3. **Interactive Features:**
   - Click **Load Notes** to send a `GET` request fetching 10 notes from JSONPlaceholder.
   - Fill out the form and submit to issue a `POST` request creating a new note (includes client-side title validation).
   - Click **Delete** on any note card to fire a `DELETE` request and dynamically update UI state.

---

## 📚 Backend System Documentation Links

Deep-dive backend design documentation engineered for production implementation is available in the `docs/` directory:

- [REST API Design Specification (`docs/api-design.md`)](./docs/api-design.md)
- [Relational Data Model & SQL Schema (`docs/data-model.md`)](./docs/data-model.md)
- [System Architecture & 1M DAU Scale Plan (`docs/architecture.md`)](./docs/architecture.md)

---

## 💡 What I Learned

1. **Defensive Asynchronous UI Design:** Managing network states cleanly requires disabling user controls during request lifecycles, safely handling zero-content list states, and rendering strings exclusively with `.textContent` to completely eliminate XSS vulnerabilities.
2. **SQL Indexing for Query Optimization:** Designing indexes tailored specifically to actual query patterns (e.g., composite B-Tree on `(user_id, created_at DESC)`) changes database lookup efficiency from $O(N)$ linear scans to $O(\log N)$ logarithmic time.
3. **Decoupling System Bottlenecks at Scale:** Scaling to 1,000,000 DAU relies on isolating reads from writes using read replicas, utilizing Redis in-memory caches to absorb peak read QPS, and leveraging asynchronous message queues to keep write responses instant.

---

## 📜 Commit History Reference (Git Requirements)

To fulfill the repository requirement, maintain at least 5 meaningful commits following this sequence:

1. `feat: initial repository setup with index.html, style.css, and base api.js`
2. `feat: Add API client with GET`
3. `feat: Add create note with POST`
4. `feat: Add delete with DELETE`
5. `docs: Add API design, data model, architecture docs, and README`
