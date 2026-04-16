import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';
@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column()
    action!: string;
    @Column('text', { nullable: true })
    details!: string;
    @ManyToOne(() => User, { nullable: true, eager: true })
    user!: User;
    @CreateDateColumn()
    timestamp!: Date;
}
