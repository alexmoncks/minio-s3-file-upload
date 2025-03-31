const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const s3Service = require('./services/s3Service');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Multer configuration for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// API Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await s3Service.uploadFile(req.file);
        res.json(result);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

app.get('/api/files', async (req, res) => {
    try {
        const files = await s3Service.listFiles();
        res.json(files);
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

app.get('/api/preview/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const fileStream = await s3Service.downloadFile(fileName);
        
        // Get file metadata to set content type
        const fileInfo = await s3Service.getFileInfo(fileName);
        res.setHeader('Content-Type', fileInfo.contentType);
        
        fileStream.pipe(res);
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ error: 'Failed to preview file' });
    }
});

app.get('/api/download/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const fileStream = await s3Service.downloadFile(fileName);
        
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

app.delete('/api/delete/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        await s3Service.deleteFile(fileName);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 