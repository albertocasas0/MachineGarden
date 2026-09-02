import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { signToken } from '../middlewares/auth.js';

// POST /api/auth/login
// Sección 7.1: mensaje de error inline sin especificar qué campo falló.
// Si vino ?next=<qr_token>, devolvemos el token para que el frontend
// redirija al wizard correspondiente.
export async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Credenciales inválidas.' });
  }

  // Generamos username normalizado (kebab-case) igual que el seed.
  const usernameNorm = String(username).trim().toLowerCase();

  const personal = await prisma.personal.findUnique({ where: { username: usernameNorm } });
  if (!personal || !personal.activo) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const ok = bcrypt.compareSync(password, personal.contrasenaHash);
  if (!ok) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const token = signToken(personal);

  // Si el front llega con un next = qr_token de un equipo, validamos que
  // exista y esté activo (sección 9: 'Este equipo ya no está disponible').
  let nextEquipo = null;
  if (req.body.next) {
    const eq = await prisma.equipo.findUnique({
      where: { qrToken: String(req.body.next) },
      include: { form: { include: { tipoMaquina: true } } },
    });
    if (eq && eq.activo) {
      nextEquipo = {
        qr_token: eq.qrToken,
        nombre: eq.nombre,
        tipo_maquina: eq.form.tipoMaquina.nombre,
      };
    }
  }

  return res.json({
    token,
    user: {
      id: personal.id,
      nombre: personal.nombre,
      apellido: personal.apellido,
      username: personal.username,
      rol: personal.rol,
    },
    next_equipo: nextEquipo,
  });
}

// GET /api/auth/me — datos de la sesión actual.
export async function me(req, res) {
  res.json({
    id: req.user.id,
    nombre: req.user.nombre,
    apellido: req.user.apellido,
    username: req.user.username,
    rol: req.user.rol,
  });
}

// POST /api/auth/logout
// JWT sin estado: el cliente descarta el token. El back sólo lo confirma.
// (La invalidación server-side es punto abierto; ver sección 16.)
export async function logout(_req, res) {
  res.json({ ok: true });
}
