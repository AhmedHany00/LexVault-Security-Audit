import 'reflect-metadata';
import http   from 'http';
import dotenv from 'dotenv';
import { AppDataSource }  from './config/database';
import { requestHandler } from './app';
dotenv.config();
const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer(requestHandler);
AppDataSource.initialize()
    .then(() => {
        const dbType = process.env.DB_TYPE === 'postgres' ? 'PostgreSQL' : 'SQLite';
        console.log(`✔ Database connected (${dbType})`);
        server.listen(port, () => {
            console.log(`✔ Server running at http://localhost:${port}`);
            console.log(`  DB_TYPE = ${process.env.DB_TYPE || 'sqlite'}`);
            console.log(`  NODE_ENV = ${process.env.NODE_ENV || 'development'}`);
        });
    })
    .catch((err) => {
        console.error('✘ Database connection failed:', err);
        process.exit(1);
    });
