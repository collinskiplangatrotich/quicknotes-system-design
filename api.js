```javascript
// Configuration Constant
const API_URL = "https://jsonplaceholder.typicode.com/posts";

// DOM Element Selections
const loadBtn = document.getElementById("load-btn");
const submitBtn = document.getElementById("submit-btn");
const statusPara = document.getElementById("status");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const notesList = document.getElementById("notes-list");

// Local state array holding notes currently rendered on UI
let stateNotes = [];

/**
 * Helper to update UI Status Message with distinct styling classes.
 * @param {string} text - Message text to display
 * @param {'loading'|'success'|'error'|'clear'} type - UI status type
 */
function setStatus(text, type) {
  statusPara.className = "status-msg";
  if (type === "clear" || !text) {
    statusPara.textContent = "";
    statusPara.style.display = "none";
    return;
  }
  statusPara.textContent = text;
  statusPara.classList.add(type);
}

/**
 * Helper to enable or disable interactive buttons during asynchronous network requests.
 * @param {boolean} disabled - Whether buttons should be disabled
 */
function setButtonsDisabled(disabled) {
  loadBtn.disabled = disabled;
  submitBtn.disabled = disabled;
  const deleteBtns = notesList.querySelectorAll(".btn-danger");
  deleteBtns.forEach((btn) => (btn.disabled = disabled));
}

/**
 * Generic Reusable Async HTTP Request Wrapper.
 * Performs fetch, verifies HTTP status ok, and throws meaningful errors.
 * @param {string} url - Target URL endpoint
 * @param {RequestInit} options - Fetch configuration options
 * @returns {Promise<any>}
 */
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorMsg = `HTTP Error ${response.status}: ${response.statusText || "Request failed"}`;
    throw new Error(errorMsg);
  }

  // Handle empty 204 No Content responses safely
  if (response.status === 204) {
    return { success: true, status: 204 };
  }

  return await response.json();
}

/**
 * Render list of notes safely using textContent to protect against XSS injection.
 */
function renderNotesList() {
  notesList.innerHTML = "";

  if (stateNotes.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    emptyLi.textContent = "No notes available. Click 'Load Notes' or create a new note above.";
    notesList.appendChild(emptyLi);
    return;
  }

  stateNotes.forEach((note) => {
    const li = document.createElement("li");
    li.className = "note-item";
    li.dataset.id = note.id;

    const contentDiv = document.createElement("div");
    contentDiv.className = "note-content";

    const titleH3 = document.createElement("h3");
    titleH3.className = "note-title";
    // Crucial security requirement: Strict textContent usage
    titleH3.textContent = note.title;

    const bodyP = document.createElement("p");
    bodyP.className = "note-body";
    bodyP.textContent = note.body || "(No body text provided)";

    contentDiv.appendChild(titleH3);
    contentDiv.appendChild(bodyP);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteNote(note.id));

    li.appendChild(contentDiv);
    li.appendChild(deleteBtn);

    notesList.appendChild(li);
  });
}

/**
 * Task 1: Fetch 10 Notes from Server (GET)
 */
async function loadNotes() {
  setStatus("Loading notes...", "loading");
  setButtonsDisabled(true);

  try {
    const data = await request(`${API_URL}?_limit=10`);
    stateNotes = data.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
    }));

    renderNotesList();
    setStatus(`Loaded ${stateNotes.length} notes from the server.`, "success");
  } catch (err) {
    console.error("Failed to fetch notes:", err);
    setStatus(`Failed to load notes: ${err.message}`, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

/**
 * Task 2: Form Submit & Client Validation (POST)
 * @param {Event} event 
 */
async function createNote(event) {
  event.preventDefault();

  const titleValue = titleInput.value.trim();
  const bodyValue = bodyInput.value.trim();

  // Input Validation Rules
  if (!titleValue) {
    setStatus("Validation Error: Note title is required.", "error");
    return;
  }

  if (titleValue.length > 100) {
    setStatus("Validation Error: Title must not exceed 100 characters.", "error");
    return;
  }

  setStatus("Creating note...", "loading");
  setButtonsDisabled(true);

  try {
    const payload = {
      title: titleValue,
      body: bodyValue,
      userId: 1,
    };

    const createdNote = await request(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Add returned note to the top of the UI list
    const newNote = {
      id: createdNote.id,
      title: createdNote.title,
      body: createdNote.body,
    };

    stateNotes.unshift(newNote);
    renderNotesList();

    // Reset Form Input Fields
    noteForm.reset();

    // Status message output displaying HTTP status 201 and new ID
    setStatus(`Note created (status 201, id ${newNote.id}).`, "success");
  } catch (err) {
    console.error("Failed to create note:", err);
    setStatus(`Failed to create note: ${err.message}`, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

/**
 * Task 3: Delete Note (DELETE)
 * Note on Mock API Behavior:
 * JSONPlaceholder is a fake REST API. While it responds with status HTTP 200/204 to 
 * DELETE requests, it does NOT actually modify backend database records or persist changes. 
 * Therefore, freshly created local UI notes with fake IDs (like ID 101) won't truly exist 
 * on the backend server. To ensure a seamless user experience, we execute the API request 
 * attempt, and upon HTTP success response, remove the item locally from stateNotes array in memory.
 * @param {number|string} id - Id of note to delete
 */
async function deleteNote(id) {
  setStatus(`Deleting note ID ${id}...`, "loading");
  setButtonsDisabled(true);

  try {
    await request(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    // Optimistically remove note from local UI state on server confirmation
    stateNotes = stateNotes.filter((note) => note.id !== id);
    renderNotesList();

    setStatus(`Note ${id} deleted successfully.`, "success");
  } catch (err) {
    console.error(`Failed to delete note ${id}:`, err);
    setStatus(`Failed to delete note ${id}: ${err.message}`, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

// Event Listener Attachments
document.addEventListener("DOMContentLoaded", () => {
  loadBtn.addEventListener("click", loadNotes);
  noteForm.addEventListener("submit", createNote);
  renderNotesList(); // Render initial empty state
});
```
