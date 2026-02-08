export interface Prospect {
    id?: string;
    name: string;
    partner: string;
    email: string;
    phone: string;
    eventDate: string;
    budget: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    notes?: string;
    archived?: boolean;
    archivedAt?: any;
    createdAt?: any;
    updatedAt?: any;
}
