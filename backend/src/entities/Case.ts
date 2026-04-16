import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
    ManyToOne, OneToMany,
} from 'typeorm';
import { User }     from './User';
import { Document } from './Document';
export enum CaseStatus {
    PENDING = 'Pending',
    ACTIVE  = 'Active',
    CLOSED  = 'Closed'
}
@Entity('cases')
export class Case {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column()
    title!: string;
    @Column('text', { nullable: true })
    description!: string;
    @Column()
    caseNumber!: string;
    @Column({ type: 'varchar', default: CaseStatus.PENDING })
    status!: CaseStatus;
        @ManyToOne(() => User, { eager: true, nullable: true })
    assignedLawyer!: User | null;
        @ManyToOne(() => User, { eager: true, nullable: true })
    client!: User | null;
    @OneToMany(() => Document, document => document.case)
    documents!: Document[];
    @CreateDateColumn()
    createdAt!: Date;
    @UpdateDateColumn()
    updatedAt!: Date;
}
