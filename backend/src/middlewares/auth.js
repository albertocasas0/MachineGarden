import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { ROLES, rolPuede } from '../utils/enums.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '10h';

export function signToken(personal) {
  return jwt.sign(
    { sub: personal.id, username: personal.username, rol: personal.rol },
    SECRET,
    { expiresIn: EXPIRES_IN },
  );
}

// Verifica JWT y carga el personal activo en req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });

  try {
    const payload = jwt.verify(token, SECRET);
    const personal = await prisma.personal.findUnique({ where: { id: payload.sub } });
    if (!personal || !personal.activo) {
      return res.status(401).json({ error: 'Sesión inválida.' });
    }
    req.user = personal;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// Guard por rol/acción (sección 4). Usar después de requireAuth.
export function requirePermiso(accion) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado.' });
    if (!rolPuede(req.user.rol, accion)) {
      return res.status(403).json({ error: 'No tiene permisos para esta acción.' });
    }
    next();
  };
}

export { ROLES };
