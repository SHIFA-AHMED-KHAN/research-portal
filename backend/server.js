// ============================================================
// Research Opportunity Portal - Backend REST API
// CN Assignment #01 | Node.js + Express + MySQL
//
// Endpoints:
//   POST   /api/opportunities      Create a research opportunity
//   GET    /api/opportunities      Retrieve all research opportunities
//   GET    /api/opportunities/:id  Retrieve one research opportunity
//   PUT    /api/opportunities/:id  Update a research opportunity
//   DELETE /api/opportunities/:id  Delete a research opportunity
// ============================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the frontend (../frontend) from the same server.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Columns that may be written through the API.
const WRITABLE_FIELDS = [
  'title',
  'description',
  'research_area',
  'faculty_name',
  'department',
  'required_skills',
  'positions',
  'deadline',
  'status',
];

// Fields that must be present (non-empty) when creating an opportunity.
const REQUIRED_ON_CREATE = [
  'title',
  'description',
  'research_area',
  'faculty_name',
  'department',
  'deadline',
];

/**
 * Validate opportunity fields.
 * @param {object} data    fields supplied by the client
 * @param {boolean} isUpdate  true for PUT (partial updates allowed)
 * @returns {string[]} list of human-readable error messages (empty = valid)
 */
function validateOpportunity(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    for (const field of REQUIRED_ON_CREATE) {
      const value = data[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        errors.push(`'${field}' is required.`);
      }
    }
  }

  if (data.title !== undefined && String(data.title).trim() === '') {
    errors.push("'title' must not be empty.");
  }
  if (data.description !== undefined && String(data.description).trim() === '') {
    errors.push("'description' must not be empty.");
  }
  if (data.research_area !== undefined && String(data.research_area).trim() === '') {
    errors.push("'research_area' must not be empty.");
  }
  if (data.faculty_name !== undefined && String(data.faculty_name).trim() === '') {
    errors.push("'faculty_name' must not be empty.");
  }
  if (data.department !== undefined && String(data.department).trim() === '') {
    errors.push("'department' must not be empty.");
  }

  if (data.positions !== undefined) {
    const n = Number(data.positions);
    if (!Number.isInteger(n) || n < 1) {
      errors.push("'positions' must be a positive integer.");
    }
  }

  if (data.deadline !== undefined) {
    // Accept YYYY-MM-DD; reject anything that is not a real calendar date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.deadline))) {
      errors.push("'deadline' must be a valid date in YYYY-MM-DD format.");
    } else {
      const d = new Date(String(data.deadline) + 'T00:00:00Z');
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== data.deadline) {
        errors.push("'deadline' must be a valid calendar date.");
      }
    }
  }

  if (data.status !== undefined && data.status !== 'Open' && data.status !== 'Closed') {
    errors.push("'status' must be either 'Open' or 'Closed'.");
  }

  return errors;
}

/** Keep only writable fields from the client payload. */
function pickWritable(data) {
  const out = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) {
      out[field] = data[field];
    }
  }
  return out;
}

/** Fetch a single opportunity by id; returns undefined when not found. */
async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [id]);
  return rows[0];
}

// ------------------------------------------------------------
// 1. Create a research opportunity
// ------------------------------------------------------------
app.post('/api/opportunities', async (req, res) => {
  try {
    const errors = validateOpportunity(req.body || {}, false);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed.', details: errors });
    }

    const data = pickWritable(req.body);
    const [result] = await pool.query(
      `INSERT INTO opportunities
         (title, description, research_area, faculty_name, department,
          required_skills, positions, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title.trim(),
        data.description.trim(),
        data.research_area.trim(),
        data.faculty_name.trim(),
        data.department.trim(),
        (data.required_skills || '').toString().trim(),
        data.positions !== undefined ? Number(data.positions) : 1,
        data.deadline,
        data.status || 'Open',
      ]
    );

    const created = await findById(result.insertId);
    return res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/opportunities failed:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------
// 2. Retrieve all research opportunities
// ------------------------------------------------------------
app.get('/api/opportunities', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM opportunities ORDER BY id ASC');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('GET /api/opportunities failed:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------
// 3. Retrieve one research opportunity by id
// ------------------------------------------------------------
app.get('/api/opportunities/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid opportunity id.' });
    }
    const opportunity = await findById(id);
    if (!opportunity) {
      return res.status(404).json({ error: `Opportunity with id ${id} not found.` });
    }
    return res.status(200).json(opportunity);
  } catch (err) {
    console.error('GET /api/opportunities/:id failed:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------
// 4. Update a research opportunity (partial updates allowed)
// ------------------------------------------------------------
app.put('/api/opportunities/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid opportunity id.' });
    }

    const existing = await findById(id);
    if (!existing) {
      return res.status(404).json({ error: `Opportunity with id ${id} not found.` });
    }

    const data = pickWritable(req.body || {});
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    const errors = validateOpportunity(data, true);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed.', details: errors });
    }

    const assignments = [];
    const values = [];
    for (const [field, value] of Object.entries(data)) {
      assignments.push(`${field} = ?`);
      values.push(
        field === 'positions'
          ? Number(value)
          : typeof value === 'string'
            ? value.trim()
            : value
      );
    }
    values.push(id);

    await pool.query(
      `UPDATE opportunities SET ${assignments.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await findById(id);
    return res.status(200).json(updated);
  } catch (err) {
    console.error('PUT /api/opportunities/:id failed:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------
// 5. Delete a research opportunity
// ------------------------------------------------------------
app.delete('/api/opportunities/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid opportunity id.' });
    }

    const existing = await findById(id);
    if (!existing) {
      return res.status(404).json({ error: `Opportunity with id ${id} not found.` });
    }

    await pool.query('DELETE FROM opportunities WHERE id = ?', [id]);
    return res.status(200).json({ message: `Opportunity with id ${id} deleted.` });
  } catch (err) {
    console.error('DELETE /api/opportunities/:id failed:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Unknown API routes -> 404 JSON (keeps frontend routing untouched).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// ------------------------------------------------------------
// Start the server (only when run directly, not when required)
// ------------------------------------------------------------
if (require.main === module) {
  // Fail fast with a clear message when MySQL is unreachable.
  pool
    .query('SELECT 1')
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Research Opportunity Portal running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error(
        'Cannot connect to MySQL. Check your .env settings and make sure MySQL is running.'
      );
      console.error(`Details: ${err.message}`);
      process.exit(1);
    });
}

module.exports = app;
