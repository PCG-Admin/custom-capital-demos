import type { SessionUser } from '@/types/user'

type MockUser = SessionUser & { password: string }

export const mockUsers: MockUser[] = [
  {
    id: '90000000-0000-0000-0000-000000000000',
    full_name: 'Admin User',
    email: 'admin@customcapital.com',
    role: 'Administrator',
    responsible_workflow: 'all',
    responsible_step: 'All Workflow Steps',
    password: 'admin123',
  },
  {
    id: '90000000-0000-0000-0000-000000000001',
    full_name: 'Lena Martinez',
    email: 'lena.martinez@customcapital.com',
    role: 'Application Intake Specialist',
    responsible_workflow: 'rental_credit_application',
    responsible_step: 'Rental Credit Application Review',
    password: 'intake123',
  },
  {
    id: '90000000-0000-0000-0000-000000000002',
    full_name: 'David Patel',
    email: 'david.patel@customcapital.com',
    role: 'Credit Analyst',
    responsible_workflow: 'rental_credit_application',
    responsible_step: 'Credit Check',
    password: 'credit123',
  },
  {
    id: '90000000-0000-0000-0000-000000000003',
    full_name: 'Emily Zhang',
    email: 'emily.zhang@customcapital.com',
    role: 'Deal Desk Manager',
    responsible_workflow: 'rental_credit_application',
    responsible_step: 'Deal Approval',
    password: 'deal123',
  },
  {
    id: '90000000-0000-0000-0000-000000000004',
    full_name: 'Marcus Reed',
    email: 'marcus.reed@customcapital.com',
    role: 'Senior Credit Reviewer',
    responsible_workflow: 'rental_credit_application',
    responsible_step: 'Credit Review',
    password: 'review123',
  },
  {
    id: '90000000-0000-0000-0000-000000000005',
    full_name: 'Priya Menon',
    email: 'priya.menon@customcapital.com',
    role: 'Credit Committee Chair',
    responsible_workflow: 'rental_credit_application',
    responsible_step: 'Approval/Decline/Defer',
    password: 'committee123',
  },
] as const
