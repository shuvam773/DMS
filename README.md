
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

<pre><code>```bash
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
 ```</code></pre>

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, CSS
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

bash
git clone <repo-url>
cd DMS


### 2. Install Dependencies

bash
cd client
npm install

cd ../server
npm install


### 3. Configure Environment

- Set up your PostgreSQL database
- Update connection strings in the backend (`server/config/db.js` or `.env`)

### 4. Initialize Database

bash
psql -U <your_username> -d <your_db_name> -f db/schema.sql


---

## 🚀 Usage

### Start Backend

bash
cd server
npm start


### Start Frontend

bash
cd client
npm run dev


- Frontend: [http://localhost:5173](http://localhost:5173)  
- Backend: [http://localhost:3000](http://localhost:3000)

---

## 🧑‍💻 Development

- **Frontend**: Work in `client/src/components/pages/`
- **Backend**: Modify logic in `server/controllers/` and routes in `server/routes/`
- **Database**: Update `db/schema.sql` and models in `server/models/`

---

## 🐳 Docker Support

To run the full stack with Docker:

bash
docker-compose up --build


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



