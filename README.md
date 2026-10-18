<p align="center">
  <a href="https://wcrm.si" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/akashsinghdotnet/wcrm/main/frontend/public/wcrm-brand-logo-dark.png">
      <img src="https://raw.githubusercontent.com/akashsinghdotnet/wcrm/main/frontend/public/wcrm-brand-logo-light.png" alt="Wcrm Logo" width="240" />
    </picture>
  </a>
</p>

<h1 align="center">Wcrm — The Modern Open-Source WhatsApp CRM</h1>

<p align="center">
  <strong>The scalable, official WhatsApp Cloud API CRM for customer support, broadcast marketing, AI agents, and workflow automations.</strong>
</p>

<p align="center">
  <a href="https://wcrm.si"><img src="https://img.shields.io/badge/Website-wcrm.si-059669?style=flat-square" alt="Website"></a>
  <a href="https://github.com/akashsinghdotnet/wcrm/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=flat-square" alt="License: AGPL-3.0"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/Backend-NestJS_11-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
</p>

---

## 🌟 Overview

**Wcrm** is a self-hostable, modern WhatsApp CRM designed for businesses, agencies, and developers. Built from the ground up for the **Official Meta WhatsApp Cloud API**, it guarantees compliance, zero phone number bans, and enterprise scalability.

Whether you want to deploy a self-hosted instance on your own server or connect hundreds of team members to a unified WhatsApp inbox, Wcrm provides the complete operating system for WhatsApp business messaging.

---

## ⚡️ Key Features

- 💬 **Shared Team Inbox**: Multi-agent shared inbox with live messaging, agent assignment, collision detection, and internal notes.
- 🚀 **Official WhatsApp Cloud API**: Built strictly on Meta's official Graph API. Zero fragile web-scraping or QR-code sessions.
- 📢 **Broadcast Campaigns**: Send scheduled mass campaigns using Meta-approved marketing & utility templates with live delivery/read analytics.
- 👥 **Audience & Contact CRM**: Filter and organize contacts with tags, custom lists, opt-in/opt-out compliance tracking, and CSV bulk import.
- 🤖 **AI Agents & Flow Automations**: Build 24/7 intelligent automated responders and conditional visual triggers for inquiries.
- 🔔 **Multi-Channel Notifications**: Real-time bell notifications, sound alerts, and unread badges across all conversation threads.
- 🔌 **Integrations**: Embeddable website lead capture forms, Meta Lead Ads, and REST webhooks for external apps.
- 🐳 **1-Click Self-Hosting**: Fully containerized stack with Docker Compose for effortless deployment.

---

## 🚀 1-Step Quick Start (Recommended)

Self-hosting Wcrm takes less than 2 minutes.

### Option 1: One-Line Automated Installer
Run this single command on your Linux/macOS server:

```bash
git clone https://github.com/akashsinghdotnet/wcrm.git && cd wcrm && ./install.sh
```

The installer will:
1. Verify Docker and Docker Compose (and offer auto-install on Debian/Ubuntu).
2. Generate secure cryptographic secrets for JWT and database credentials automatically.
3. Build and launch PostgreSQL, NestJS API, and React frontend in detached containers.

---

### Option 2: Manual Docker Compose Setup
If you prefer to configure environment variables manually:

```bash
# 1. Clone repository
git clone https://github.com/akashsinghdotnet/wcrm.git
cd wcrm

# 2. Configure Environment
cp backend/.env.example backend/.env

# 3. Start Stack
docker compose up -d
```

---

### 🌐 First-Time Onboarding Wizard
Once started, open your browser:
* **Web CRM App**: `http://localhost` (or `http://your-server-ip`)
* **Backend API**: `http://localhost:4000/api`

On your first visit, Wcrm will automatically launch the **Initial Setup Wizard** prompting you to create your organization workspace and primary **Company Administrator account**. You can start adding team members and connecting WhatsApp immediately!

---

## 🛠 Manual Local Development Setup

### Prerequisites
* Node.js 20+ and npm
* PostgreSQL 15+ or MySQL 8+

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```
The NestJS backend will start on `http://localhost:4000/api`.

### 2. Frontend Setup
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```
The Vite React frontend will start on `http://localhost:5173`.

---

## 📂 Architecture & Directory Structure

```
wcrm/
├── backend/                  # NestJS 11 REST API & WebSocket service
│   ├── src/
│   │   ├── whatsapp/         # Meta WhatsApp Cloud API engine
│   │   ├── leads/            # Contact management & pipelines
│   │   ├── dashboard/        # Metrics & engagement stats
│   │   └── ...
│   ├── Dockerfile            # Multi-stage production container
│   └── .env.example          # Safe configuration template
├── frontend/                 # React 19 + Tailwind CSS SPA
│   ├── src/
│   │   ├── pages/            # Team inbox, broadcasts, templates, settings
│   │   └── components/       # Layout, modals, navigation
│   ├── nginx.conf            # Production SPA & API reverse proxy
│   ├── Dockerfile            # Nginx production container
│   └── .env.example
├── docker-compose.yml        # Multi-service stack (DB + Backend + Frontend)
└── LICENSE                   # AGPL-3.0 License
```

---

## 🛡 Security & Meta Webhook Setup

1. In your [Meta App Dashboard](https://developers.facebook.com):
   - Navigate to **WhatsApp > Configuration**.
   - Set **Callback URL** to: `https://your-domain.com/api/whatsapp/webhook`
   - Set **Verify Token** to match your webhook verify token.
2. Subscribe to the following webhook fields:
   - `messages`
   - `message_template_status_update`

---

## 📄 License

Wcrm Open-Source Edition is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

For managed cloud hosting, automated backups, and enterprise SLAs, visit **[Wcrm Cloud](https://wcrm.si)**.
