import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create captures folder if it doesn't exist
const capturesDir = path.join(__dirname, 'captures');
if (!fs.existsSync(capturesDir)) {
    fs.mkdirSync(capturesDir);
    console.log('✓ Created captures folder');
}

// Endpoint to save images
app.post('/save-image', (req, res) => {
    try {
        const { image, filename } = req.body;

        if (!image || !filename) {
            return res.status(400).json({ error: 'Missing image or filename' });
        }

        // Remove data URL prefix
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Save to captures folder
        const filepath = path.join(capturesDir, filename);
        fs.writeFileSync(filepath, buffer);

        console.log(`✓ Saved: ${filename}`);

        res.json({
            success: true,
            path: filepath,
            filename: filename
        });

    } catch (error) {
        console.error('Error saving image:', error);
        res.status(500).json({ error: 'Failed to save image' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Image server running on http://localhost:${PORT}`);
    console.log(`📁 Images will be saved to: ${capturesDir}\n`);
});
