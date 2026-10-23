# QuickNotes Database Data Model & SQL Schema Specification

This document outlines the entity relationship design, SQL tables, indexing strategy, and relational architecture selection for QuickNotes.

---

## 1. Entities & Attributes Definition

1. **`users`**: Represents registered platform accounts.
   - `id` (BIGINT, Primary Key)
   - `username` (VARCHAR(50), Unique, Not Null)
   - `email` (VARCHAR(255), Unique, Not Null)
   - `password_hash` (VARCHAR(255), Not Null)
   - `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

2. **`notes`**: Stores note title, content, and owner.
   - `id` (BIGINT, Primary Key)
   - `user_id` (BIGINT, Foreign Key -> `users.id`, Not Null)
   - `title` (VARCHAR(100), Not Null)
   - `body` (TEXT, Nullable)
   - `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)
   - `updated_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

3. **`tags`**: Labels created by users to organize notes.
   - `id` (BIGINT, Primary Key)
   - `name` (VARCHAR(50), Not Null)
   - `user_id` (BIGINT, Foreign Key -> `users.id`, Not Null)

4. **`note_tags`**: Junction table mapping notes to tags.
   - `note_id` (BIGINT, Foreign Key -> `notes.id`)
   - `tag_id` (BIGINT, Foreign Key -> `tags.id`)
   - Primary Key: (`note_id`, `tag_id`)

---

## 2. Entity Relationships Explanation

- **`users` to `notes` (One-to-Many / $1:N$):** One user can own multiple notes, but each note belongs strictly to a single user.
- **`users` to `tags` (One-to-Many / $1:N$):** One user can create multiple tags for category organization.
- **`notes` to `tags` (Many-to-Many / $M:N$):** A single note can have multiple tags, and a single tag can be assigned to multiple notes. This is implemented via the junction table `note_tags`.

---

## 3. CREATE TABLE SQL Statements

```sql
-- Enable Strict Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Notes Table
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tags Table
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);

-- 4. Note_Tags Junction Table
CREATE TABLE note_tags (
    note_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

---

## 4. Example SQL Queries

### Query 1: Retrieve All Notes for a Specific User with Tag Names (JOIN)
```sql
SELECT 
    n.id AS note_id,
    n.title,
    n.body,
    n.created_at,
    GROUP_CONCAT(t.name, ', ') AS associated_tags
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = 1
GROUP BY n.id
ORDER BY n.created_at DESC;
```

### Query 2: Search Notes by Title Keyword
```sql
SELECT id, title, body, updated_at
FROM notes
WHERE user_id = 1 AND title LIKE '%architecture%'
ORDER BY updated_at DESC;
```

### Query 3: Count Total Notes Per User
```sql
SELECT 
    u.id AS user_id,
    u.username,
    COUNT(n.id) AS total_notes
FROM users u
LEFT JOIN notes n ON u.id = n.user_id
GROUP BY u.id;
```

---

## 5. Indexing Strategy

```sql
CREATE INDEX idx_notes_user_id_created ON notes(user_id, created_at DESC);
```

### Justification
The most frequent database query in QuickNotes is displaying an authenticated user's home feed containing their recent notes (`WHERE user_id = ? ORDER BY created_at DESC`). Without an index on `user_id`, the database must perform a full table scan ($O(N)$) across millions of records. A composite B-Tree index on `(user_id, created_at DESC)` optimizes this lookup into an $O(\log N)$ operation, allowing instant retrieval of the top 10 or 20 user notes even at high system scale.

---

## 6. SQL vs. NoSQL Justification Choice

We select a **Relational SQL Database (PostgreSQL)** for the primary QuickNotes data layer. SQL provides mandatory **ACID (Atomicity, Consistency, Isolation, Durability)** compliance, guaranteeing absolute data consistency during user authentication and tag mapping operations. The data structure is structured and well-defined; core operations rely heavily on relational constraints (e.g., deleting a user automatically cascades and purges orphaned notes and tag mappings via Foreign Keys). While NoSQL document stores excel at unstructured dynamic payloads, SQL combined with Redis caching provides superior integrity, complex querying (`JOIN`), and predictability at scale.
