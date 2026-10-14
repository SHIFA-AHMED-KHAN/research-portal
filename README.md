# University Research Opportunity Portal

CN Assignment #01 (BCS-5C, Fall 2026). A web application where faculty members
can post, view, update, and manage research opportunities. Built with
**Node.js + Express** (backend REST API), **MySQL** (database), and
**HTML/CSS/JavaScript** (frontend).

GitHub Repository: https://github.com/SHIFA-AHMED-KHAN/research-portal


## Project structure

```
research-opportunity-portal/
  backend/     Express REST API (server.js, db.js)
  frontend/    Single-page UI (index.html, styles.css, app.js)
  database/    MySQL schema (schema.sql)
  postman/     Exported Postman collection (all API test scenarios)
  README.md    This file
```

## Prerequisites

- Node.js 18+ and npm
- MySQL 8+ running locally

## Setup

1. Create the database and table:

```bash
mysql -u root -p < database/schema.sql
```

2. Make sure the backend can log in to MySQL. Two common cases:
   - **XAMPP / Windows:** MySQL `root` with an empty password usually works
     over TCP. Keep the defaults in `.env` (`DB_USER=root`, `DB_PASSWORD=`
     empty).
   - **Linux (Ubuntu/Debian):** MySQL `root` uses socket authentication, so
     create a dedicated user for the app:
     ```sql
     CREATE USER 'portal'@'localhost' IDENTIFIED BY 'portal123';
     GRANT ALL PRIVILEGES ON research_portal.* TO 'portal'@'localhost';
     FLUSH PRIVILEGES;
     ```
     then set `DB_USER=portal` and `DB_PASSWORD=portal123` in `.env`.

3. Install backend dependencies:

```bash
cd backend
npm install
```

4. Configure the database connection (copy the example and edit if needed):

```bash
cp .env.example .env
```

**Never commit your real `.env` to GitHub** (it is already in `.gitignore`).

## Run

```bash
cd backend
npm start
```

Then open http://localhost:3000 in a browser. The same server hosts the
frontend and the API.

## API reference

Base URL: `http://localhost:3000/api/opportunities`

| Method | Endpoint                     | Description                        | Success |
|--------|------------------------------|------------------------------------|---------|
| POST   | /api/opportunities           | Create a research opportunity      | 201     |
| GET    | /api/opportunities           | Retrieve all opportunities         | 200     |
| GET    | /api/opportunities/:id       | Retrieve one opportunity           | 200     |
| PUT    | /api/opportunities/:id       | Update an opportunity (partial ok) | 200     |
| DELETE | /api/opportunities/:id       | Delete an opportunity              | 200     |

Error codes: `400` validation errors (with a `details` list), `404` unknown id,
`500` server/database errors.

Example create request:

```bash
curl -X POST http://localhost:3000/api/opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI-Driven Network Intrusion Detection",
    "description": "Research on applying ML to detect intrusions in campus networks.",
    "research_area": "Machine Learning",
    "faculty_name": "Dr. Ayesha Khan",
    "department": "Computer Science",
    "required_skills": "Python, Machine Learning",
    "positions": 3,
    "deadline": "2026-12-31",
    "status": "Open"
  }'
```

## Testing with Postman

1. Import `postman/Research_Opportunity_Portal.postman_collection.json` into Postman.
2. Start the backend (`npm start`).
3. Run the requests in order (1 to 10). Requests 1-3 store the created ids as
   collection variables used by the later requests.
4. Each request has automated tests checking the expected status code.

The collection covers: creating 3 opportunities, listing all, fetching one,
updating, closing (Open to Closed), deleting, 404 after delete, and a 400
invalid-input case.

## Demo video

`demo.mp4` (one minute) shows the server running, the UI, creating/listing/
updating/closing/deleting an opportunity, a validation error, and the Postman
collection running.
