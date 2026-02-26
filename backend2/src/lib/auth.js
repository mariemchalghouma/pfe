import jwt from 'jsonwebtoken';

export const verifyAuth = (request) => {
  const authHeader = request.headers.get('authorization') || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

export const unauthorizedResponse = (message = 'Non autorisé - Token invalide') =>
  Response.json({ success: false, message }, { status: 401 });
