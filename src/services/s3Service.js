const Minio = require('minio');
const imageProcessingService = require('./imageProcessingService');
const path = require('path');

class S3Service {
    constructor() {
        this.minioClient = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT,
            port: 443,
            useSSL: true,
            accessKey: process.env.MINIO_ACCESS_KEY,
            secretKey: process.env.MINIO_SECRET_KEY,
            forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE === 'true'
        });
        this.bucketName = process.env.MINIO_BUCKET_NAME;
    }

    async uploadFile(file, options = {}) {
        try {
            const buffer = await file.buffer;
            let processedBuffer = buffer;
            let fileName = file.originalname;

            // Process image if it's an image file
            if (imageProcessingService.isImageFile(file.mimetype)) {
                processedBuffer = await imageProcessingService.processImage(buffer, options);
                fileName = path.parse(fileName).name + '.png';
            }

            // Upload to Minio
            await this.minioClient.putObject(
                this.bucketName,
                fileName,
                processedBuffer,
                file.size,
                { 'Content-Type': file.mimetype }
            );

            return {
                fileName,
                size: file.size,
                mimetype: file.mimetype
            };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    async listFiles(page = 1, pageSize = 12, searchQuery = '') {
        try {
            const objects = await this.minioClient.listObjects(this.bucketName);
            let files = [];
            
            for await (const obj of objects) {
                const fileInfo = await this.minioClient.statObject(this.bucketName, obj.name);
                files.push({
                    name: obj.name,
                    size: fileInfo.size,
                    lastModified: fileInfo.lastModified,
                    contentType: fileInfo.metaData['content-type'] || this.getContentType(obj.name)
                });
            }
            
            // Apply search filter if query exists
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                files = files.filter(file => 
                    file.name.toLowerCase().includes(query) ||
                    file.contentType.toLowerCase().includes(query)
                );
            }
            
            // Sort files by last modified date (newest first)
            files.sort((a, b) => b.lastModified - a.lastModified);
            
            // Calculate pagination
            const totalFiles = files.length;
            const totalPages = Math.ceil(totalFiles / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            
            // Get the current page's files
            const paginatedFiles = files.slice(startIndex, endIndex);
            
            return {
                files: paginatedFiles,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalFiles,
                    pageSize
                }
            };
        } catch (error) {
            console.error('Error listing files:', error);
            throw new Error('Failed to list files');
        }
    }

    async getFile(fileName) {
        try {
            const file = await this.minioClient.getObject(this.bucketName, fileName);
            return file;
        } catch (error) {
            console.error('Error getting file:', error);
            throw new Error(`Failed to get file: ${error.message}`);
        }
    }

    async getFileInfo(fileName) {
        try {
            const stat = await this.minioClient.statObject(this.bucketName, fileName);
            return {
                contentType: this.getContentType(fileName),
                size: stat.size,
                lastModified: stat.lastModified
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            throw new Error(`Failed to get file info: ${error.message}`);
        }
    }

    async deleteFile(fileName) {
        try {
            await this.minioClient.removeObject(this.bucketName, fileName);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    getContentType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.webm': 'video/webm',
            '.svg': 'image/svg+xml',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'font/otf',
            '.webp': 'image/webp',
            '.avif': 'image/avif',
            '.heic': 'image/heic',
            '.heif': 'image/heif',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.mkv': 'video/x-matroska',
            '.m4v': 'video/x-m4v',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
            '.wma': 'audio/x-ms-wma',
            '.flac': 'audio/flac',
            '.alac': 'audio/alac',
            '.aiff': 'audio/aiff',
            '.eps': 'application/postscript',
            '.ai': 'application/postscript',
            '.psd': 'image/vnd.adobe.photoshop',
            '.sketch': 'application/x-sketch',
            '.fig': 'application/x-figma',
            '.xd': 'application/x-adobe-xd',
            '.swf': 'application/x-shockwave-flash',
            '.exe': 'application/x-msdownload',
            '.dmg': 'application/x-apple-diskimage',
            '.iso': 'application/x-iso9660-image',
            '.vhd': 'application/x-virtualbox-vhd',
            '.vmdk': 'application/x-vmware-disk',
            '.ova': 'application/x-virtualbox-ova',
            '.ovf': 'application/x-vmware-ovf',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip',
            '.7z': 'application/x-7z-compressed',
            '.bz2': 'application/x-bzip2',
            '.xz': 'application/x-xz',
            '.lzma': 'application/x-lzma',
            '.zst': 'application/zstd',
            '.lz4': 'application/lz4',
            '.lzo': 'application/lzo',
            '.lzf': 'application/lzf',
            '.lzh': 'application/lzh',
            '.lha': 'application/lha',
            '.arj': 'application/arj',
            '.cab': 'application/vnd.ms-cab-compressed',
            '.chm': 'application/vnd.ms-htmlhelp',
            '.hlp': 'application/winhlp',
            '.wsf': 'text/xml',
            '.vbs': 'text/vbscript',
            '.jsx': 'text/jsx',
            '.ts': 'text/typescript',
            '.tsx': 'text/tsx',
            '.py': 'text/x-python',
            '.rb': 'text/x-ruby',
            '.php': 'text/x-php',
            '.java': 'text/x-java',
            '.c': 'text/x-c',
            '.cpp': 'text/x-c++',
            '.h': 'text/x-c',
            '.hpp': 'text/x-c++',
            '.cs': 'text/x-csharp',
            '.go': 'text/x-go',
            '.rs': 'text/x-rust',
            '.swift': 'text/x-swift',
            '.kt': 'text/x-kotlin',
            '.scala': 'text/x-scala',
            '.r': 'text/x-r',
            '.m': 'text/x-matlab',
            '.f': 'text/x-fortran',
            '.pl': 'text/x-perl',
            '.pm': 'text/x-perl',
            '.t': 'text/x-perl',
            '.pod': 'text/x-pod',
            '.sh': 'text/x-sh',
            '.bash': 'text/x-sh',
            '.zsh': 'text/x-sh',
            '.fish': 'text/x-fish',
            '.sql': 'text/x-sql',
            '.graphql': 'text/x-graphql',
            '.yaml': 'text/yaml',
            '.yml': 'text/yaml',
            '.toml': 'text/toml',
            '.ini': 'text/ini',
            '.conf': 'text/conf',
            '.properties': 'text/properties',
            '.env': 'text/env',
            '.csv': 'text/csv',
            '.tsv': 'text/tab-separated-values',
            '.jsonl': 'application/x-jsonlines',
            '.ndjson': 'application/x-ndjson',
            '.log': 'text/plain',
            '.md': 'text/markdown',
            '.rst': 'text/x-rst',
            '.tex': 'text/x-tex',
            '.ltx': 'text/x-tex',
            '.sty': 'text/x-tex',
            '.cls': 'text/x-tex',
            '.bib': 'text/x-bibtex',
            '.ris': 'application/x-research-info-systems',
            '.enw': 'application/x-endnote',
            '.wos': 'application/x-web-of-science',
            '.nbib': 'application/x-nbib',
            '.csl': 'application/x-csl'
        };
        return contentTypes[ext] || 'application/octet-stream';
    }
}

module.exports = new S3Service(); 