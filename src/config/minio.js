const { Client } = require('minio');
require('dotenv').config();

const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: 443,
    useSSL: true,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE === 'true'
});

module.exports = minioClient; 