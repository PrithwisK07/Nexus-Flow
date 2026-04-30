# Nexus Flow

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![Web3](https://img.shields.io/badge/Web3-Base_Sepolia-red)
![AI](https://img.shields.io/badge/AI-Gemini_2.5-orange)

**Nexus Flow** is a Turing-complete, fault-tolerant, Web3-native autonomous agent automation engine.

Designed for DeFi power users, traders, and Web3 developers, Nexus Flow allows you to build complex, multi-step workflows using a visual node-based canvas. It features Smart Account abstraction, AI-driven routing, deep DeFi integrations, and stateful workflows that can pause and resume seamlessly.

![Nexus Flow Canvas Overview](./docs/nexus-canvas-hero.png)

---

## 🏗️ Project Structure

This repository contains two main parts:

* `server/` → Node.js backend with Express, BullMQ, Redis, Pub/Sub, and workflow worker processing
* `frontend/` → Next.js UI for building and managing workflows

---

## ✨ Core Features

* 🧠 **AI-Driven Routing** – Dynamic workflow decisions using LLM logic
* 💳 **Smart Account Abstraction** – Powered by `viem` and Pimlico
* 🔄 **Stateful Execution** – Resume workflows without losing progress
* 🛡️ **Fault Tolerance** – Auto-pause on failures and recover safely
* 📞 **Real-time Feedback** – Socket-based execution tracking
* 🔍 **Dynamic Data Handling** – Resolve variables and external payloads

---

## 🛠️ Tech Stack

* **Frontend:** Next.js, React, TailwindCSS
* **Backend:** Node.js, Express, BullMQ, Socket.io
* **Queue & State:** Redis + Redis Pub/Sub
* **Web3:** viem, Base Sepolia, Pimlico
* **Integrations:** Google Sheets API (optional)

---

## 🚀 Requirements

* Node.js 18+ (Node 20 recommended)
* npm
* Redis (local or remote)
* Optional: Google service account JSON

---

## ⚙️ Setup

### 1. Start Redis

If Redis is not running:

```bash
docker run --rm -p 6379:6379 redis:latest
```

---

### 2. Configure Backend Environment

Create a `.env` file inside `server/`:

```env
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
# OR use:
# REDIS_URL=redis://localhost:6379

RPC_URL=https://your-rpc-node-url
MASTER_KEY=0xYOUR_PRIVATE_KEY
PIMLICO_API_KEY=your-pimlico-api-key

# Optional
# PUBLIC_URL=http://localhost:3001
# RENDER_EXTERNAL_URL=http://localhost:3001
```

#### Google Sheets (Optional)

Place your service account JSON at:

```
server/src/google-service-account.json
```

---

### 3. Install Dependencies

#### Backend

```bash
cd server
npm install
```

#### Frontend

```bash
cd frontend
npm install
```

---

## ▶️ Run the Project

You need **3 processes running simultaneously**.

---

### 1. Start Backend API

```bash
cd server
npm run dev
```

Runs on: `http://localhost:3001`

---

### 2. Start Worker

In another terminal:

```bash
cd server
npm run worker
```

Processes workflow jobs using BullMQ.

---

### 3. Start Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Runs on: `http://localhost:3000`

---

## ⚠️ Important Notes

* Redis must be running before starting the backend or worker
* Worker **must be running** for workflows to execute
* Backend connects via:

  * `REDIS_URL` **or**
  * `REDIS_HOST` + `REDIS_PORT`
* Smart account logic requires:

  * `RPC_URL`
  * `MASTER_KEY`
  * `PIMLICO_API_KEY`
* To change backend port, modify `PORT` in `.env`

---

## 📚 Node System Overview

### Triggers

* Webhook
* Schedule (Cron/Timer)
* Google Sheets

### Logic

* Condition (If/Else)
* Switch Router
* Iterator (loop execution)

### Web3 Actions

* Balance Reads
* Token Transfers
* DeFi Interactions (Aave, etc.)

### AI

* Structured LLM outputs for decision making

---

## 🔄 Execution Flow

1. Frontend builds workflow visually
2. Backend converts it into executable actions
3. Jobs are pushed to Redis queue
4. Worker processes each node step-by-step
5. Results stream back via sockets

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch

   ```bash
   git checkout -b feature/YourFeature
   ```
3. Make changes
4. Commit

   ```bash
   git commit -m "Add feature"
   ```
5. Push

   ```bash
   git push origin feature/YourFeature
   ```
6. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

