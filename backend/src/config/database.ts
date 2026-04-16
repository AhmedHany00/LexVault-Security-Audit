import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import { User }     from '../entities/User';
import { Case }     from '../entities/Case';
import { Document } from '../entities/Document';
import { AuditLog } from '../entities/AuditLog';
dotenv.config();
const isPostgres = process.env.DB_TYPE === 'postgres';
const sqliteOptions: DataSourceOptions = {
    type:        'sqlite',
    database:    'secure_legal_db.sqlite',
    synchronize: true,
    logging:     false,
    entities:    [User, Case, Document, AuditLog],
    migrations:  [],
    subscribers: [],
};
const postgresOptions: DataSourceOptions = {
    type:        'postgres',
    host:        process.env.DB_HOST     || 'localhost',
    port:        parseInt(process.env.DB_PORT || '5432', 10),
    username:    process.env.DB_USER     || 'postgres',
    password:    process.env.DB_PASSWORD || 'admin',
    database:    process.env.DB_NAME     || 'secure_legal_db',
    synchronize: true,   
    logging:     false,
    entities:    [User, Case, Document, AuditLog],
    migrations:  [],
    subscribers: [],
    ssl:         process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};
export const AppDataSource = new DataSource(
    isPostgres ? postgresOptions : sqliteOptions
);
