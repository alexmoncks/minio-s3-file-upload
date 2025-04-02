# S3 Bucket File Management System

A modern web application for managing files in an S3/Minio bucket with advanced features like image processing, file preview, and search functionality.

## Features

### File Management
- 📁 Drag and drop file upload
- 🔍 Search files by name or type
- 📄 File preview for various formats
- ⬇️ File download
- 🗑️ File deletion
- 📱 Responsive grid layout

### Image Processing
- 🖼️ Automatic thumbnail generation
- 📏 Image resizing
- 🎨 Background removal
- 🔄 Format conversion
- ⚡ Optimized image delivery

### User Interface
- 🎯 Modern and clean design
- 📊 Progress indicators
- 🔔 Toast notifications
- 🖼️ Thumbnail previews
- 📱 Mobile-responsive layout
- 🎨 File type icons

## Tech Stack

### Frontend
- Vanilla JavaScript
- Bootstrap 5
- Font Awesome icons
- Modern CSS Grid

### Backend
- Node.js
- Express.js
- Multer for file uploads
- Sharp.js for image processing

### Storage
- Minio/S3 compatible storage
- Stream-based file handling
- Efficient caching

## Prerequisites

- Node.js (v14 or higher)
- Minio server or S3-compatible storage
- npm or yarn package manager

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
MINIO_ENDPOINT=your-minio-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=your-bucket-name
MINIO_FORCE_PATH_STYLE=true
PORT=3000
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd s3-bucket-sample
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## API Endpoints

### File Management
- `POST /api/upload` - Upload a file
- `GET /api/files` - List files with pagination and search
- `GET /api/files/:fileName` - Download a file
- `GET /api/preview/:fileName` - Preview a file
- `GET /api/thumbnail/:fileName` - Get file thumbnail
- `DELETE /api/delete/:fileName` - Delete a file

### Image Processing Options
```javascript
{
    width: number,              // Target width
    height: number,             // Target height
    maintainAspectRatio: boolean, // Keep aspect ratio
    removeBackground: boolean   // Remove image background
}
```

## File Type Support

The system supports various file types including:
- Images (JPEG, PNG, GIF, WebP, SVG)
- Documents (PDF, DOC, DOCX)
- Text files (TXT, CSV, HTML, CSS, JS)
- Audio files (MP3, WAV, OGG)
- Video files (MP4, WebM)
- And many more...

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Minio](https://min.io/) for S3-compatible storage
- [Sharp.js](https://sharp.pixelplumbing.com/) for image processing
- [Bootstrap](https://getbootstrap.com/) for UI components
- [Font Awesome](https://fontawesome.com/) for icons 