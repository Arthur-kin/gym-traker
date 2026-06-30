# Gymformer 🏋️

A containerized full-stack gym tracker and visual gym layout customizer, powered by React, Node.js, PostgreSQL, and Google Gemini AI.

---

## 🚀 Features

* **Visual Gym Canvas**: Drag-and-drop interactive grid to place gym equipment (free weights, strength machines, cardio equipment) and customize your gym layout.
* **Flexible Workout Logger**: Seamlessly log both strength training (sets, reps, weight) and cardio sessions (heart rate, incline, resistance, duration).
* **Smart Analytics**: anterior/posterior muscle heatmaps and progress evolution charts visualizing your training frequency and intensity.
* **AI Coach Integration**:
  * **Goal Recommendation**: Generates tailored training goals based on your historical workouts and user profile.
  * **Goal Evaluation**: Provides professional feedback on target feasibility and safety tips.
  * **Monthly Training Report**: Summarizes your training volume and muscle distribution, complete with an interactive chat sidebar to consult your AI Coach.

---

## 🛠️ Tech Stack

* **Frontend**: React (TypeScript), Vite, Recharts, Lucide Icons, Nginx
* **Backend**: Node.js, Express, Prisma ORM, express-rate-limit
* **Database**: PostgreSQL 15
* **Orchestration**: Docker Compose

---

## 📦 Getting Started

### Prerequisites

* [Docker](https://www.docker.com/) and Docker Compose installed.
* A Google Gemini API Key (for AI Coach features).

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd gym-tracker
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   POSTGRES_USER=gymuser
   POSTGRES_PASSWORD=your_db_password_here
   POSTGRES_DB=gymdb
   FRONTEND_ORIGIN=http://localhost:8085
   ```

3. **Start the Application**:
   Run the Docker Compose command to build and launch all services:
   ```bash
   docker compose up -d --build
   ```

4. **Access the App**:
   Open your browser and navigate to:
   * **Frontend**: `http://localhost:8085`
   * **Backend API**: `http://localhost:5000`

---

## 🔒 Security & Performance Features

* **Network Isolation**: PostgreSQL port is bound to `127.0.0.1` and isolated within the internal Docker bridge network.
* **CORS Protection**: REST endpoints are protected and restricted to the designated frontend origin.
* **Rate Limiting**: Protects backend endpoints against brute-force calls, with strict limits on expensive AI endpoints.
* **Database Performance**: Configured relational database indexes on foreign keys and active goal queries.
* **Optimized Calculations**: Goal progress metrics calculation optimized to a single O(M) data pass with batch updates.
