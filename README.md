# FSIS — Fire Station Transfer Request System

Region II Cagayan Valley fire station personnel transfer request management.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Express, TypeScript
- **Database:** PostgreSQL

## Setup

1. **Create the PostgreSQL database:**

```sql
CREATE DATABASE fsis_request;
```

2. **Install dependencies:**

```bash
npm run install:all
```

3. **Configure environment:**

Edit `server/.env` with your PostgreSQL credentials.

4. **Run migration:**

```bash
npm run migrate
```

5. **Start the app:**

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Features

- Submit transfer requests between fire stations in Region II
- View all requests in a dashboard
- Approve or deny pending requests
- 15 pre-loaded fire stations across Cagayan Valley
