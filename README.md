
# 💊 Drug Management System (DMS)

A full-stack web application for managing drug inventories, orders, and users across multiple roles — **Admin**, **Institute**, and **Pharmacy**. Built using **React + Vite** on the frontend and **Node.js + Express** on the backend, with **PostgreSQL** as the database.

---

## 📚 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [Development](#development)
- [Docker Support](#docker-support)
- [License](#license)

---

## ✅ Features

- **Role-based Access**: Admin, Institute, and Pharmacy with distinct dashboards and permissions.
- **Drug Inventory Management**: Add, edit, and track drugs with batch, expiry, and stock details.
- **Order Management**: Place, approve, and track orders between institutes and pharmacies.
- **Analytics Dashboards**: Visualize inventory, orders, and user activity.
- **User Management**: Register, edit, and manage institutes and pharmacies.
- **Authentication & Authorization**: Secure login with protected routes.
- **Responsive UI**: Clean and modern interface with mobile responsiveness.

---

## 📁 Project Structure

<pre><code>
DMS/
├── client/             # Frontend (React + Vite)
│   └── src/
│       ├── components/       # Reusable components
│       │   └── pages/        # Dashboards for Admin, Institute, Pharmacy
│       ├── context/          # User context, route protection
│       ├── constants/        # Static drug data, enums
│       └── utils/            # Helper functions
│
├── server/             # Backend (Node.js + Express)
│   ├── controllers/         # Business logic
│   ├── routes/              # API routes
│   ├── models/              # DB Models
│   └── middlewares/         # Auth, role checks
│
├── db/
│   └── schema.sql       # PostgreSQL schema
│
└── docker-compose.yml
 </code></pre>

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose

---

## 🗃️ Database Schema

- **users**: Stores all user types (admin, institute, pharmacy) with role, status, and contact info.
- **drugs**: Drug inventory with type, batch, expiry, stock, and price.
- **orders**: Main order records linking senders and recipients.
- **order_items**: Drugs in each order with quantity, price, and status.

➡️ For full schema, check [`db/schema.sql`](db/schema.sql)

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js (v16+)
- npm
- PostgreSQL
- Docker (optional)

### 1. Clone the Repository

<pre><code>
git clone https://github.com/shuvam773/DMS.git <repo-url>
cd DMS
</code></pre>


### 2. Install Dependencies
<pre><code>
cd client
npm install
</code></pre>
<pre><code>
cd ../server
npm install
</code></pre>

### 4. Environment Variables Create a `.env` file in the `server/` directory with the following variables: 
#### Set up your PostgreSQL database environment 
<pre><code>
PORT=8080 
JWT_SECRET=your_jwt_secret_here 

DB_HOST=localhost 
DB_USER=postgres 
DB_PORT=5432 
DB_PASSWORD=your_db_password_here 
DB_NAME=dms

OPENROUTER_API_KEY=your_openrouter_api_key
</code></pre>

## 5. Download and install postgreSQL 

### Initialize Database Schema

<pre><code>
psql -U "your_username" -d "your_db_name" -f db/schema.sql
</code></pre>

---

## 🚀 Usage

### Start Backend

<pre><code>
cd server
npm run dev
</code></pre>

### Start Frontend

<pre><code>
cd client
npm run dev
</code></pre>

- Frontend: [http://localhost:5173](http://localhost:5173)  
- Backend: [http://localhost:8080](http://localhost:8080)

---

## 🧑‍💻 Development

- **Frontend**: Work in `client/src/components/pages/`
- **Backend**: Modify logic in `server/controllers/` and routes in `server/routes/`
- **Database**: Update `db/schema.sql` and models in `server/models/`

---

## 🐳 Docker Support

To run the full stack with Docker:

<pre><code>
docker-compose up --build
 </code></pre>

This spins up:
- Frontend
- Backend
- PostgreSQL database

All services are defined in `docker-compose.yml`.

---

## 🤝 Contributing

Contributions are welcome!  
Feel free to open an issue or submit a pull request.

---

## 📬 Contact

For questions or support, please open an issue on the GitHub repository.

---



