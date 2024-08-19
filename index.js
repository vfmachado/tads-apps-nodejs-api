

import express from 'express';

import sqlite3 from 'sqlite3';
import * as jwt from 'jsonwebtoken';

const db = new sqlite3.Database(':memory:');


db.run(`
   CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      password TEXT
   );
      
   CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
   )
`);

const app = express();
app.use(express.json());
app.post('/api/users', (req, res) => {
    const { email, password } = req.body;
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (err) => {
        if (err) {
            res.status(500).send('Error inserting user');
        } else {
            res.status(201).send('User inserted');
        }
    });
});

app.get('/api/users', (req, res) => {
    db.all('SELECT email FROM users', (err, rows) => {
        if (err) {
            res.status(500).send('Error fetching users');
        } else {
            res.status(200).send(rows);
        }
    });
});

app.post('/api/auth', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT id, email FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
        if (err) {
            res.status(500).send('Error authenticating user');
        } else if (row) {
            const jwt = jwt.sign({ 
                id: row.id,
                email: row.email
            }, 'secret');
            res.status(200).send(jwt);
        } else {
            res.status(401).send('User not authenticated');
        }
    });
});


const isAuthenticated = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token) {
        jwt.verify(token, 'secret')
            .then((user) => {
                req.user = user;
                next();
            })
            .catch(() => {
                res.status(401).send('User not authenticated');
            });
    }
    else {
        res.status(401).send('User not authenticated');
    }
}


app.post('/api/posts', isAuthenticated, (req, res) => {
    const { title, content, user_id } = req.body;
    db.run('INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)', [title, content, user_id], (err) => {
        if (err) {
            res.status(500).send('Error inserting post');
        } else {
            res.status(201).send('Post inserted');
        }
    });
});


app.get('/api/posts', isAuthenticated, (req, res) => {
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;
    const user = req.user;
    db.all('SELECT title, content FROM posts WHERE user_id <> ? LIMIT ? OFFSET ?', [user.id, limit, offset], (err, rows) => {
        if (err) {
            res.status(500).send('Error fetching posts');
        } else {
            res.status(200).send(rows);
        }
    });

});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
