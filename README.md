# Mini Payment Processing System

A backend-focused payment processing simulation built with **Node.js, Express.js, MongoDB, Redis, BullMQ, and Docker**.

The project demonstrates how payment requests can be processed asynchronously using a job queue and background worker instead of performing all processing inside the HTTP request lifecycle.

It also implements **payment status tracking, retry logic, and idempotency** to demonstrate important concepts used in payment and distributed backend systems.

---

## Features

* Create payment requests through a REST API
* Store payment records in MongoDB
* Asynchronous payment processing
* Redis-backed job queue using BullMQ
* Independent background worker
* Payment retry logic
* Payment status tracking
* Idempotency protection against duplicate payment requests
* Docker-based Redis setup
* Separation of routes, services, models, queues, and workers

---

## Tech Stack

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Queue & Background Processing

* BullMQ
* Redis
* ioredis

### Infrastructure

* Docker

### API Testing

* Postman

---

## System Architecture

```text
                         Client / Postman
                               |
                               |
                     POST /api/create-payment
                               |
                               v
                        Express API Server
                               |
                               v
                       Idempotency Check
                         /             \
                        /               \
              Existing Request       New Request
                    |                     |
                    |                     v
                    |             Create Payment
                    |              status=pending
                    |                     |
                    |                     v
                    |                  MongoDB
                    |                     |
                    |                     v
                    |               BullMQ Queue
                    |                     |
                    |                     v
                    |                   Redis
                    |                     |
                    |                     v
                    |            Background Worker
                    |                     |
                    |                     v
                    |             Payment Service
                    |                     |
                    |                     v
                    |             Retry Processing
                    |                     |
                    |                     v
                    |          Update Payment Status
                    |             success / failed
                    |                     |
                    \_____________________/
                               |
                               v
                            MongoDB

Client can check the final result using:

GET /api/payments/:id
```

---

## Payment Processing Flow

### 1. Client creates a payment

The client sends a payment request with an `Idempotency-Key`.

```http
POST /api/create-payment
```

Example body:

```json
{
  "amount": 500
}
```

Example header:

```text
Idempotency-Key: payment-test-001
```

---

### 2. Idempotency validation

The server checks whether a payment already exists with the same idempotency key.

If it exists, the existing payment is returned instead of creating another payment.

This helps prevent duplicate payment creation when a client retries the same request.

---

### 3. Payment record is created

For a new request, a payment is stored in MongoDB with:

```text
status = pending
```

The API now has a permanent payment ID before background processing begins.

---

### 4. Job is added to BullMQ

The payment ID is added as a job to the BullMQ payment queue.

BullMQ uses Redis to manage queued jobs.

The API does not wait for payment processing to finish.

It returns:

```http
202 Accepted
```

Example:

```json
{
  "message": "Payment accepted for processing",
  "paymentId": "PAYMENT_ID",
  "status": "pending"
}
```

---

### 5. Worker processes the payment

A separate Node.js worker listens to the BullMQ queue.

When a new job arrives:

```text
Redis
  ↓
BullMQ Worker
  ↓
Payment Service
```

The worker retrieves the existing payment using its payment ID and processes it.

---

### 6. Retry logic

If the simulated payment attempt fails, the application retries the operation according to the implemented retry logic.

After processing, the payment status becomes:

```text
success
```

or:

```text
failed
```

The updated status is stored in MongoDB.

---

### 7. Client checks payment status

The client can retrieve the latest payment status using:

```http
GET /api/payments/:id
```

Example response:

```json
{
  "paymentId": "PAYMENT_ID",
  "amount": 500,
  "status": "success"
}
```

---

## Why Redis and BullMQ?

Payment processing can involve work that should not keep an HTTP request open unnecessarily.

Instead of directly processing the payment inside the API request:

```text
Request
   ↓
Process Payment
   ↓
Wait
   ↓
Response
```

this project uses asynchronous processing:

```text
Request
   ↓
Create Payment
   ↓
Queue Job
   ↓
Return 202 Accepted

Meanwhile:

Queue
   ↓
Worker
   ↓
Process Payment
   ↓
Update MongoDB
```

### Redis

Redis provides fast storage used by BullMQ for managing queued jobs and job state.

### BullMQ

BullMQ provides queue functionality on top of Redis, including job management and background worker processing.

### MongoDB

MongoDB stores the permanent payment records.

Therefore, the responsibilities are separated:

```text
MongoDB → Permanent payment data

Redis/BullMQ → Background job management
```

---

## Idempotency

Duplicate requests are dangerous in payment systems.

For example, a client may send the same payment request twice because of:

* Network timeout
* User clicking Pay multiple times
* Client-side retry
* Temporary connection failure

The API accepts an:

```text
Idempotency-Key
```

If the same key is received again, the system returns the existing payment rather than intentionally creating another payment request.

Example:

```text
Request 1
Idempotency-Key: payment-test-001

        ↓

Payment ID: ABC123
```

Repeated request:

```text
Request 2
Idempotency-Key: payment-test-001

        ↓

Existing Payment ID: ABC123
```

A different key represents a new payment operation.

---

## Project Structure

```text
mini-payment-system/
│
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── models/
│   │   └── paymentModel.js
│   │
│   ├── queue/
│   │   └── paymentQueue.js
│   │
│   ├── routes/
│   │   └── paymentRoutes.js
│   │
│   ├── services/
│   │   └── paymentService.js
│   │
│   └── workers/
│       └── paymentWorker.js
│
├── server.js
├── package.json
├── package-lock.json
├── .env
├── .gitignore
└── README.md
```

---

## Installation

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>

cd mini-payment-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file and add the environment variables required by your application, including your MongoDB connection configuration.

Do not commit `.env` to GitHub.

---

## Start Redis with Docker

Pull the Redis image:

```bash
docker pull redis
```

Create and start the Redis container:

```bash
docker run -d --name redis-server -p 6379:6379 redis
```

If the container already exists but is stopped:

```bash
docker start redis-server
```

Verify:

```bash
docker ps
```

Redis should be available on:

```text
localhost:6379
```

---

## Run the Application

The API server and background worker run as separate Node.js processes.

### Terminal 1 — API Server

```bash
node server.js
```

Expected output:

```text
Server running on port 5000
MongoDB Connected
```

### Terminal 2 — Payment Worker

```bash
node src/workers/paymentWorker.js
```

Expected output:

```text
Worker Started...
MongoDB Connected
```

---

## API Endpoints

### Create Payment

```http
POST /api/create-payment
```

Header:

```text
Idempotency-Key: payment-test-001
```

Body:

```json
{
  "amount": 500
}
```

Example response:

```json
{
  "message": "Payment accepted for processing",
  "paymentId": "PAYMENT_ID",
  "status": "pending"
}
```

---

### Get Payment Status

```http
GET /api/payments/:id
```

Example:

```text
GET /api/payments/PAYMENT_ID
```

Example response:

```json
{
  "paymentId": "PAYMENT_ID",
  "amount": 500,
  "status": "success"
}
```

---

## Key Engineering Concepts Demonstrated

* REST API design
* Asynchronous job processing
* Message/job queues
* Background workers
* Redis-backed queue architecture
* Separation of concerns
* Service-layer architecture
* Database persistence
* Retry handling
* Idempotent API design
* Docker-based infrastructure
* Independent Node.js processes

---

## Limitations

This project is a learning-oriented payment processing simulation and does not process real financial transactions.

It does not currently include:

* Integration with real payment gateways
* Authentication and authorization
* Real card or banking data
* Webhook verification
* Refunds and settlements
* Production-grade observability
* Distributed locking for all concurrency scenarios
* Production security/compliance requirements such as PCI DSS

These concerns would be required for a real production payment platform.

---

## Future Scope

A larger payment orchestration system could extend these concepts with:

* Multiple payment gateways
* Intelligent gateway routing
* Gateway failover
* Circuit breakers
* Webhooks
* Refund workflows
* Payment analytics
* Rate limiting
* Authentication
* Monitoring and observability

---

## Purpose

This project was built to understand the backend architecture behind asynchronous payment processing, including how APIs, databases, queues, Redis, and background workers interact in a distributed-style workflow.
