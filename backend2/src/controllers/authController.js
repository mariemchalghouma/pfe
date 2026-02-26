import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const login = async (req) => {
  try {
    const { email, password } = await req.json();

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return Response.json(
        { success: false, message: 'Email ou mot de passe invalide' },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const isMatch = password == user.password;

    if (!isMatch) {
      return Response.json(
        { success: false, message: 'Email ou mot de passe invalide' },
        { status: 401 }
      );
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '2d',
    });

    return Response.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    return Response.json(
      { success: false, message: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
};

export const getMe = async (user) => {
  try {
    const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [
      user.id,
    ]);

    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error in getMe:', error);
    return Response.json(
      { success: false, message: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
};
