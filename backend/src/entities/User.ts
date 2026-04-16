import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
export enum UserRole {
    ADMIN     = 'admin',
    LAWYER    = 'lawyer',
    CLIENT    = 'client',
    PARALEGAL = 'paralegal'
}
@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column({ unique: true })
    email!: string;
    @Column()
    password!: string;
    @Column()
    firstName!: string;
    @Column()
    lastName!: string;
    @Column({ type: 'varchar', default: UserRole.CLIENT })
    role!: UserRole;
    @CreateDateColumn()
    createdAt!: Date;
    @UpdateDateColumn()
    updatedAt!: Date;
}
