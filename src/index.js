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

        let options = {};
        if (req.body.options) {
            try {
                options = JSON.parse(req.body.options);
                // Validate options
                if (options.width && (isNaN(options.width) || options.width <= 0)) {
                    return res.status(400).json({ error: 'Invalid width value' });
                }
                if (options.height && (isNaN(options.height) || options.height <= 0)) {
                    return res.status(400).json({ error: 'Invalid height value' });
                }
                if (typeof options.maintainAspectRatio !== 'undefined' && typeof options.maintainAspectRatio !== 'boolean') {
                    return res.status(400).json({ error: 'maintainAspectRatio must be a boolean' });
                }
                if (typeof options.removeBackground !== 'undefined' && typeof options.removeBackground !== 'boolean') {
                    return res.status(400).json({ error: 'removeBackground must be a boolean' });
                }
            } catch (error) {
                console.error('Error parsing options:', error);
                return res.status(400).json({ error: 'Invalid options format' });
            }
        }

        const result = await s3Service.uploadFile(req.file, options);
        res.json(result);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
});

app.get('/api/files', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 12;
        const search = req.query.search || '';
        
        const result = await s3Service.listFiles(page, pageSize, search);
        res.json(result);
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

app.get('/api/preview/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const fileStream = await s3Service.getFile(fileName);
        
        // Get file metadata to set content type
        const fileInfo = await s3Service.getFileInfo(fileName);
        
        // Set appropriate headers
        res.setHeader('Content-Type', fileInfo.contentType);
        
        // Handle the stream properly
        fileStream.on('error', (error) => {
            console.error('Stream error:', error);
            res.status(500).json({ error: 'Failed to stream file' });
        });
        
        fileStream.pipe(res);
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ error: 'Failed to preview file' });
    }
});

app.get('/api/thumbnail/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const fileStream = await s3Service.getFile(fileName);
        
        // Get file metadata to check content type
        const fileInfo = await s3Service.getFileInfo(fileName);
        
        // Only generate thumbnails for images
        if (!fileInfo.contentType.startsWith('image/')) {
            return res.status(400).json({ error: 'File is not an image' });
        }
        
        // Generate thumbnail using Sharp
        const sharp = require('sharp');
        
        // Convert stream to buffer first
        const chunks = [];
        for await (const chunk of fileStream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        const thumbnail = sharp(buffer)
            .resize(200, 200, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({
                quality: 80,
                progressive: true
            });
        
        res.setHeader('Content-Type', 'image/jpeg');
        thumbnail.pipe(res);
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
});

app.get('/api/files/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const fileStream = await s3Service.getFile(fileName);
        
        // Get file metadata to set content type
        const fileInfo = await s3Service.getFileInfo(fileName);
        res.setHeader('Content-Type', fileInfo.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        fileStream.pipe(res);
    } catch (error) {
        console.error('File download error:', error);
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