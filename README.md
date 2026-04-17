# 🐣 CodePet

**CodePet** is a full-stack, AI-powered productivity companion designed to gamify habit-building and daily consistency. Built with a high-performance "Orbitron" aesthetic, it bridges the gap between secure cloud infrastructure and interactive gamification.

---

## 🚀 Technical Highlights

* **Secure Auth Architecture:** Custom-engineered 6-digit OTP (One-Time Password) verification grid powered by **Supabase Auth** and **Resend SMTP**.
* **Persistent State:** Real-time cloud synchronization of pet selection, XP, and leveling using **PostgreSQL** and Row Level Security (RLS).
* **Vibe-Coded UI:** A "Porsche-level" interface featuring glassmorphism, gradient text effects, and custom CSS keyframe animations for a premium feel.
* **AI Orchestration Ready:** Architected to support multi-model agentic dialogue and evolutionary pet logic.

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite |
| **Backend/DB** | Supabase (PostgreSQL) |
| **Auth/Security** | Supabase GoTrue, Cloudflare Turnstile |
| **Email Service** | Resend (SMTP Integration) |
| **Icons/Styling** | Lucide React, Custom CSS Keyframes |

## 📦 Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/naormeit/Code-Pet.git](https://github.com/naormeit/Code-Pet.git)
    cd Code-Pet
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## 🎯 Project Roadmap

- [x] Professional OTP Authentication Flow
- [x] Supabase Database Integration
- [x] Persistent Pet Selection Logic
- [ ] AI-driven habit coaching (Agentic integration)
- [ ] Interactive Pet XP & Evolution System
- [ ] Social Leaderboards for Habit Consistency

---

Developed by [Naorem Ngathoiba Singh](https://github.com/naormeit) — Full-Stack AI Developer & Software Product Engineer.