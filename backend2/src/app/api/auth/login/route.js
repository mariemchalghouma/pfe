import { login } from '@/controllers/authController';

export async function POST(request) {
  return login(request);
}

