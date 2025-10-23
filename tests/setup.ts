process.env.NODE_ENV = 'test';
process.env.SERVER_API_KEY = process.env.SERVER_API_KEY ?? 'test-api-key-123456';
process.env.SQLITE_PATH = process.env.SQLITE_PATH ?? ':memory:';
process.env.SEED_SAMPLE_DATA = 'false';
process.env.FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL ?? 'http://localhost:8000/api/v1';
