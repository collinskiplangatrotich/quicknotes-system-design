# QuickNotes System API Design Specification

This document defines the formal RESTful API specification for the Production QuickNotes Backend Infrastructure.

---

## 1. REST Endpoints Summary Table

| Method | Endpoint Path | Description | Success Status | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notes` | List paginated notes for authenticated user | `200 OK` | Yes (Bearer Token) |
| `POST` | `/api/v1/notes` | Create a new note | `201 Created` | Yes (Bearer Token) |
| `GET` | `/api/v1/notes/{id}` | Retrieve details of a specific note | `200 OK` | Yes (Bearer Token) |
| `PUT` | `/api/v1/notes/{id}` | Update title and body of an existing note | `200 OK` | Yes (Bearer Token) |
| `DELETE`| `/api/v1/notes/{id}` | Permanently remove a note | `204 No Content` | Yes (Bearer Token) |
| `GET` | `/api/v1/tags` | List all tags created by user | `200 OK` | Yes (Bearer Token) |

---

## 2. Request and Response JSON Examples

### A. Creating a Note (`POST /api/v1/notes`)

**HTTP Request Payload:**
```json
{
  "title": "System Architecture Review Checklist",
  "body": "Ensure load balancers, Redis cache layer, and read replicas are configured prior to launch.",
  "tag_ids": [10, 14]
}
```

**HTTP Success Response (`201 Created`):**
```json
{
  "id": 4821,
  "user_id": 105,
  "title": "System Architecture Review Checklist",
  "body": "Ensure load balancers, Redis cache layer, and read replicas are configured prior to launch.",
  "tags": [
    { "id": 10, "name": "DevOps" },
    { "id": 14, "name": "Infrastructure" }
  ],
  "created_at": "2026-10-23T08:30:00Z",
  "updated_at": "2026-10-23T08:30:00Z"
}
```

---

### B. Listing Notes (`GET /api/v1/notes?page=1&limit=2`)

**HTTP Success Response (`200 OK`):**
```json
{
  "data": [
    {
      "id": 4821,
      "user_id": 105,
      "title": "System Architecture Review Checklist",
      "body": "Ensure load balancers, Redis cache layer, and read replicas are configured prior to launch.",
      "tags": ["DevOps", "Infrastructure"],
      "created_at": "2026-10-23T08:30:00Z",
      "updated_at": "2026-10-23T08:30:00Z"
    },
    {
      "id": 4819,
      "user_id": 105,
      "title": "Grocery List",
      "body": "Milk, Eggs, Whole Wheat Bread, Espresso Beans",
      "tags": ["Personal"],
      "created_at": "2026-10-22T14:15:00Z",
      "updated_at": "2026-10-22T14:15:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 2,
    "total_records": 42,
    "total_pages": 21
  }
}
```

---

## 3. Error Handling and Status Codes

The QuickNotes API adheres to standardized HTTP error status codes. Every error response returns a consistent JSON payload format detailing the error reason and timestamp.

### Supported Error Codes
- `400 Bad Request`: Invalid request payload, missing mandatory fields, or title > 100 chars.
- `401 Unauthorized`: Missing, expired, or invalid HTTP Bearer authentication token.
- `403 Forbidden`: Authenticated user does not own the requested note resource.
- `404 Not Found`: Requested resource ID does not exist in database.
- `500 Internal Server Error`: An unexpected internal infrastructure fault occurred.

### Error Response Payload Example (`400 Bad Request`)
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid input payload parameters.",
    "status": 400,
    "timestamp": "2026-10-23T09:15:00Z",
    "details": [
      {
        "field": "title",
        "issue": "Title is required and must not exceed 100 characters."
      }
    ]
  }
}
```
