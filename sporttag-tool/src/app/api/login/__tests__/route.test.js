import { POST } from '../route';
import { createMocks } from 'node-mocks-http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

jest.mock('../../../lib/supabaseClient', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
        })),
    },
}));

const { supabase } = require('../../../lib/supabaseClient');

// Mocks für Next.js Response und Request
global.Request = jest.fn();
global.Response = jest.fn();

describe('Login Route', () => {
    const mockUser = {
        id: 'user123',
        username: 'testuser',
        password: bcrypt.hashSync('testpass', 10), 
        role: 'admin',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'testsecret';
        process.env.NODE_ENV = 'test'; 
    });

    it('should return 400 if username or password is missing', async () => {
        const req = new Request('http://localhost/api/login', {
            method: 'POST',
            body: JSON.stringify({ username: '' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
