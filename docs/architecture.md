# QuickNotes High-Availability System Architecture

This document presents the system architectural design for scaling QuickNotes from a prototype to a high-throughput platform capable of serving **1,000,000 Daily Active Users (DAU)**.

---

## 1. Functional & Non-Functional Requirements

### Functional Requirements
1. Users can create, read, update, and delete notes.
2. Users can assign tags to notes for search filtering.
3. Notes are instantly accessible across multiple client sessions.

### Non-Functional Requirements
1. **High Availability:** 99.99% uptime target.
2. **Low Latency:** Read requests served in `< 50ms`; write requests processed in `< 200ms`.
3. **Scalability:** System horizontally handles 1M DAU without performance degradation.
4. **Data Durability:** Zero note loss tolerance.

---

## 2. Load and Capacity Estimations (1 Million DAU)

### Key Assumptions
- **Daily Active Users (DAU):** 1,000,000
- **Daily Writes / User:** 2 notes created/updated per day
- **Daily Reads / User:** 20 note reads/list views per day
- **Average Note Size:** 2 KB (Title + Body metadata)

### Calculations
- **Total Write Requests / Day:** $1,000,000 \times 2 = 2,000,000 \text{ writes/day}$
- **Average Write QPS:** $2,000,000 / 86,400 \approx \mathbf{23.15 \text{ writes/sec}}$
- **Peak Write QPS ($5\times$ surge):** $23.15 \times 5 \approx \mathbf{115.75 \text{ writes/sec}}$

- **Total Read Requests / Day:** $1,000,000 \times 20 = 20,000,000 \text{ reads/day}$
- **Average Read QPS:** $20,000,000 / 86,400 \approx \mathbf{231.5 \text{ reads/sec}}$
- **Peak Read QPS ($5\times$ surge):** $231.5 \times 5 \approx \mathbf{1,157.5 \text{ reads/sec}}$

- **Annual Data Storage Growth:**
  $$\text{Daily Storage} = 2,000,000 \text{ notes} \times 2 \text{ KB} = 4,000,000 \text{ KB} \approx 4 \text{ GB/day}$$
  $$\text{Annual Storage Requirement} = 4 \text{ GB/day} \times 365 = \mathbf{1.46 \text{ TB/year}}$$

---

## 3. System Architecture Diagram

```
                        [ Web & Mobile Clients ]
                                   |
                                   v
                             [ Route 53 DNS ]
                                   |
                                   v
                       [ CDN (Cloudflare Edge) ]
                                   |
                                   v
                    [ Application Load Balancer ]
                                   |
                  +----------------+----------------+
                  |                                 |
                  v                                 v
        [ App Server Instance 1 ]         [ App Server Instance 2 ]
        (Stateless Node Service)          (Stateless Node Service)
            |              |                    |              |
            |              +---------+  +-------+              |
            v                        v  v                      v
    +---------------+        +------------------+    +-------------------+
    | Redis Cache   |        | Message Queue    |    | PostgreSQL        |
    | (Feed & Auth) |        | (RabbitMQ/Kafka) |    | (Primary Write)   |
    +---------------+        +------------------+    +-------------------+
                                     |                         |
                                     v                         v Replicate
                             [ Worker Service ]      +-------------------+
                             (Async Indexing /       | PostgreSQL        |
                              Email Push)            | (Read Replica)    |
                                                     +-------------------+
```

---

## 4. Single-Sentence Component Explanations

1. **Client (Web/Mobile):** Renders the user interface and initiates HTTPS REST requests.
2. **DNS (Route 53):** Resolves domain names to load balancer IP addresses using latency-based routing.
3. **CDN (Cloudflare):** Caches static assets (HTML, CSS, JS) at global edge nodes to decrease latency.
4. **Load Balancer (ALB):** Distributes incoming traffic evenly across stateless application servers.
5. **App Servers:** Executes business logic, input validation, and user authentication.
6. **In-Memory Cache (Redis):** Caches frequently read note feeds and user sessions to offload database reads.
7. **Primary Database (PostgreSQL Master):** Handles all write and update operations, guaranteeing ACID compliance.
8. **Read Replica Database:** Serves read queries asynchronously replicated from the master node to scale read capacity.
9. **Message Queue (RabbitMQ):** Decouples write operations by queuing background jobs asynchronously.
10. **Background Worker:** Consumes queue jobs to handle tasks like full-text search indexing and email notifications.

---

## 5. Step-by-Step Request Flows

### Flow 1: Fetching User Notes (`GET /notes`)
1. Client sends `GET /api/v1/notes` with Bearer auth token to Load Balancer.
2. Load Balancer forwards request to an available App Server instance.
3. App Server checks Redis Cache for pre-computed user feed.
4. **Cache Hit:** App Server returns cached JSON immediately to Client ($< 10\text{ms}$).
5. **Cache Miss:** App Server queries **PostgreSQL Read Replica**, formats JSON response, updates Redis cache, and returns notes payload to Client.

### Flow 2: Creating a Note (`POST /notes`)
1. Client sends `POST /api/v1/notes` payload to Load Balancer.
2. Load Balancer routes request to App Server.
3. App Server validates title length and user authentication token.
4. App Server writes new note record to **PostgreSQL Primary Database**.
5. App Server invalidates user's Redis feed cache and publishes a `note_created` event to Message Queue.
6. App Server immediately returns `201 Created` with new note ID to Client.
7. Background Worker picks up queue event to perform search indexing asynchronously.

---

## 6. Trade-Offs & Single Points of Failure (SPOF) Analysis

### Architectural Trade-Offs
1. **Cache Consistency vs. Read Speed (Eventual Consistency):**
   - *Trade-off:* Serving feeds via Redis guarantees sub-20ms reads, but introduces brief eventual consistency windows while cache invalidation completes across nodes.
2. **Asynchronous Queuing vs. Immediate Write Confirmation:**
   - *Trade-off:* Offloading search indexing to message queues ensures fast API HTTP responses, but means new notes become searchable after a slight multi-millisecond delay.

### Eliminating Single Points of Failure (SPOF)
- **Load Balancers & Web Servers:** Deployed across multi-AZ (Availability Zone) auto-scaling groups behind AWS ALB.
- **Database Availability:** Primary PostgreSQL utilizes Multi-AZ deployment with automatic failover to hot standby read replicas.
- **Redis High Availability:** Configured in Redis Sentinel cluster mode with multi-node replication.
