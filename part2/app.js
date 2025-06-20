const express = require('express');
const path = require('path');
require('dotenv').config();
const db = require('./db');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here

// Add session support
const session = require('express-session');
app.use(session({
    secret: 'dogwalksecret',
    resave: false,
    saveUninitialized: true
}));

// Add login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query(
            'SELECT * FROM Users WHERE username = ? AND password_hash = ?',
            [username, password]
        );
        if (rows.length === 1) {
            req.session.user = {
                id: rows[0].user_id,
                username: rows[0].username,
                role: rows[0].role
            };
            res.json({ success: true, role: rows[0].role });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// Get dogs for the logged-in owner
app.get('/api/my-dogs', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'owner') {
        return res.status(401).json({ error: 'Not authorized' });
    }
    db.query('SELECT dog_id, name FROM Dogs WHERE owner_id = ?', [req.session.user.id])
        .then(([rows]) => res.json(rows))
        .catch(() => res.status(500).json({ error: 'Database error' }));
});

module.exports = app;