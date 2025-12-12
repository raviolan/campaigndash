import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '2mb' }));

// Simple CORS for local use
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

const ENEMY_DIR = path.resolve(process.cwd(), '05_Tools & Tables', 'Enemy Generator');

// Ensure directory exists
fs.mkdirSync(ENEMY_DIR, { recursive: true });

app.post('/api/save-enemy', async (req, res) => {
    try {
        const { pageName, html, overwrite } = req.body;
        if (!pageName || !html) return res.status(400).json({ error: 'pageName and html required' });

        // sanitize filename
        const safe = pageName.replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const filename = `${safe}.html`;
        const filepath = path.join(ENEMY_DIR, filename);

        // If exists and no overwrite flag, return conflict
        const exists = fs.existsSync(filepath);
        if (exists && !overwrite) {
            return res.status(409).json({ exists: true, file: `/05_Tools%20&%20Tables/Enemy%20Generator/${encodeURIComponent(filename)}` });
        }

        await fs.promises.writeFile(filepath, html, 'utf8');
        return res.json({ ok: true, file: `/05_Tools%20&%20Tables/Enemy%20Generator/${encodeURIComponent(filename)}` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to save' });
    }
});

// Delete a saved enemy file (by filename query param)
app.delete('/api/enemy', async (req, res) => {
    try {
        const file = req.query.file;
        if (!file) return res.status(400).json({ error: 'file required' });
        // sanitize
        const safe = path.basename(file);
        const filepath = path.join(ENEMY_DIR, safe);
        if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'not found' });
        await fs.promises.unlink(filepath);
        return res.json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'failed to delete' });
    }
});

app.get('/api/enemies', async (req, res) => {
    try {
        const files = await fs.promises.readdir(ENEMY_DIR);
        const htmlFiles = files.filter(f => f.toLowerCase().endsWith('.html'));
        const list = htmlFiles.map(f => ({
            name: f.replace(/\.html$/i, ''),
            href: `/05_Tools%20&%20Tables/Enemy%20Generator/${encodeURIComponent(f)}`
        }));
        res.json(list);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'failed to list' });
    }
});

app.listen(PORT, () => {
    console.log(`Enemy backend listening on http://localhost:${PORT}`);
});
