# S3 Minio Sample Project

This project demonstrates the integration of NodeJS with Minio S3 bucket.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the values in `.env` with your Minio credentials

3. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Environment Variables

- `MINIO_ENDPOINT`: Your Minio endpoint
- `MINIO_ACCESS_KEY`: Your Minio access key
- `MINIO_SECRET_KEY`: Your Minio secret key
- `MINIO_BUCKET_NAME`: Your bucket name
- `MINIO_FORCE_PATH_STYLE`: Force path style setting
- `PORT`: Server port (default: 3000)

## API Endpoints

- `GET /`: Health check endpoint 