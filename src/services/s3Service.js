const minioClient = require('../config/minio');
const { promisify } = require('util');

class S3Service {
    constructor() {
        this.bucketName = process.env.MINIO_BUCKET_NAME;
        this.ensureBucketExists();
    }

    async ensureBucketExists() {
        try {
            const exists = await minioClient.bucketExists(this.bucketName);
            if (!exists) {
                await minioClient.makeBucket(this.bucketName);
                console.log(`Bucket '${this.bucketName}' created successfully`);
            }
        } catch (error) {
            console.error('Error ensuring bucket exists:', error);
            throw error;
        }
    }

    async uploadFile(file) {
        try {
            const objectName = file.originalname;
            await minioClient.putObject(
                this.bucketName,
                objectName,
                file.buffer,
                file.size,
                { 'Content-Type': file.mimetype }
            );
            return { success: true, objectName };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    async listFiles() {
        try {
            const stream = minioClient.listObjects(this.bucketName);
            const files = [];
            
            for await (const obj of stream) {
                const fileInfo = await this.getFileInfo(obj.name);
                files.push({
                    name: obj.name,
                    size: obj.size,
                    lastModified: obj.lastModified,
                    etag: obj.etag,
                    type: fileInfo.contentType
                });
            }
            
            return files;
        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    }

    async getFileInfo(objectName) {
        try {
            const stat = await minioClient.statObject(this.bucketName, objectName);
            return {
                contentType: stat.metaData['content-type'] || 'application/octet-stream',
                size: stat.size,
                lastModified: stat.lastModified
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    }

    async downloadFile(objectName) {
        try {
            const dataStream = await minioClient.getObject(this.bucketName, objectName);
            return dataStream;
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }

    async deleteFile(objectName) {
        try {
            await minioClient.removeObject(this.bucketName, objectName);
            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
}

module.exports = new S3Service(); 