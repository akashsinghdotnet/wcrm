import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { Activity } from './activity.entity';
import { LeadAssignmentRule } from './lead-assignment-rule.entity';
import { UsersService } from '../users/users.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

describe('LeadsService', () => {
    let service: LeadsService;
    let leadsRepositoryMock: any;

    beforeEach(async () => {
        leadsRepositoryMock = {
            create: jest.fn(data => data),
            save: jest.fn(data => Promise.resolve(data)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LeadsService,
                {
                    provide: getRepositoryToken(Lead),
                    useValue: leadsRepositoryMock,
                },
                {
                    provide: getRepositoryToken(Activity),
                    useValue: {},
                },
                {
                    provide: getRepositoryToken(LeadAssignmentRule),
                    useValue: {},
                },
                {
                    provide: UsersService,
                    useValue: {},
                },
                {
                    provide: WhatsAppService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<LeadsService>(LeadsService);
    });

    describe('importFromCsv', () => {
        it('should successfully parse a standard comma-separated CSV', async () => {
            const csv = 'name,phone,email\nJohn Doe,1234567890,john@example.com';
            const result = await service.importFromCsv(csv, 'company123');
            expect(result.imported).toBe(1);
            expect(result.errors.length).toBe(0);
            expect(leadsRepositoryMock.create).toHaveBeenCalledWith([
                {
                    companyId: 'company123',
                    name: 'John Doe',
                    phone: '1234567890',
                    email: 'john@example.com',
                    source: 'manual',
                    status: 'new',
                    notes: undefined,
                },
            ]);
        });

        it('should handle UTF-8 BOM, spaces, and quotes in headers and rows', async () => {
            const csv = '\ufeff  "Name" ; "Phone" ; "Email"  \n  "Jane Doe" ; "9876543210" ; "jane@example.com"  ';
            const result = await service.importFromCsv(csv, 'company123');
            expect(result.imported).toBe(1);
            expect(result.errors.length).toBe(0);
            expect(leadsRepositoryMock.create).toHaveBeenCalledWith([
                {
                    companyId: 'company123',
                    name: 'Jane Doe',
                    phone: '9876543210',
                    email: 'jane@example.com',
                    source: 'manual',
                    status: 'new',
                    notes: undefined,
                },
            ]);
        });

        it('should return error if name column is missing', async () => {
            const csv = 'phone,email\n1234567890,john@example.com';
            const result = await service.importFromCsv(csv, 'company123');
            expect(result.imported).toBe(0);
            expect(result.errors).toContain('Missing required "name" column');
        });

        it('should resolve column aliases like phone_number and strip p: prefix from phone numbers', async () => {
            const csv = 'email,Name,phone_number\n' +
                'ashishhack@gmail.com,ashish sharma,p:9993794378\n' +
                'ishandevaliya77@gmail.com,Ishan,p:+917388285905';
            const result = await service.importFromCsv(csv, 'company123');
            expect(result.imported).toBe(2);
            expect(result.errors.length).toBe(0);
            expect(leadsRepositoryMock.create).toHaveBeenCalledWith([
                {
                    companyId: 'company123',
                    name: 'ashish sharma',
                    phone: '9993794378',
                    email: 'ashishhack@gmail.com',
                    source: 'manual',
                    status: 'new',
                    notes: undefined,
                },
                {
                    companyId: 'company123',
                    name: 'Ishan',
                    phone: '+917388285905',
                    email: 'ishandevaliya77@gmail.com',
                    source: 'manual',
                    status: 'new',
                    notes: undefined,
                },
            ]);
        });
    });
});
