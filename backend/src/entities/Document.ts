import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
    ManyToOne,
} from 'typeorm';
import { User } from './User';
import { Case } from './Case';
@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column()
    title!: string;
    @Column()
    originalFilename!: string;
    @Column()
    storagePath!: string;
    @Column()
    fileHash!: string;
    @Column({ default: 1 })
    version!: number;
        @ManyToOne(() => Case, legalCase => legalCase.documents, { eager: true, nullable: true })
    case!: Case | null;
    @ManyToOne(() => User, { eager: true })
    uploadedBy!: User;
    @CreateDateColumn()
    createdAt!: Date;
    @UpdateDateColumn()
    updatedAt!: Date;
}
