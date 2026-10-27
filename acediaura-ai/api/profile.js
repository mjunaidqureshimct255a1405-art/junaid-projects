import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const dbUrl = process.env.DATABASE_URL;
const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
const issuer = process.env.NEON_AUTH_BASE_URL;
const keys = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!dbUrl || !keys || !issuer) return res.status(503).json({ error: 'Cloud profile backend not configured.' });
  if (!['GET','PUT'].includes(req.method)) {
    res.setHeader('Allow','GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error:'Sign in required' });
  let owner;
  try {
    const { payload } = await jwtVerify(header.slice(7), keys, { issuer });
    owner = payload.sub;
    if (!owner || typeof owner !== 'string') throw new Error('No identity');
  } catch {
    return res.status(401).json({ error:'Invalid or expired session token' });
  }
  try {
    const sql = neon(dbUrl);
    if (req.method === 'GET') {
      const rows = await sql`SELECT user_id, full_name, college, branch, current_semester, about, cgpa, sgpa_history, photo_data, updated_at
                             FROM public.student_profiles WHERE user_id = ${owner} LIMIT 1`;
      return res.status(200).json({ profile: rows[0] || null });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid profile' });
    const val = (key,max) => typeof body[key] === 'string' ? body[key].trim().slice(0,max) : '';
    const fullName = val('full_name',120), college=val('college',180),branch=val('branch',120),about=val('about',2000);
    const semester = Number.isInteger(body.current_semester) && body.current_semester >= 1 && body.current_semester <= 12
      ? body.current_semester : null;
    const cgpa = body.cgpa === '' || body.cgpa == null ? null : Number(body.cgpa);
    if(cgpa !== null && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) return res.status(400).json({error:'CGPA must be between 0 and 10'});
    const sgpaHistory = val('sgpa_history',350);
    const photo = typeof body.photo_data === 'string' ? body.photo_data : '';
    if(photo.length > 600000 || (photo && !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(photo))) return res.status(400).json({error:'Choose a smaller JPEG, PNG or WebP profile photo'});
    const rows = await sql`INSERT INTO public.student_profiles (user_id, full_name, college, branch, current_semester, about, cgpa, sgpa_history, photo_data, updated_at)
      VALUES (${owner},${fullName},${college},${branch},${semester},${about},${cgpa},${sgpaHistory},${photo},NOW())
      ON CONFLICT (user_id) DO UPDATE SET full_name=EXCLUDED.full_name, college=EXCLUDED.college,
       branch=EXCLUDED.branch, current_semester=EXCLUDED.current_semester, about=EXCLUDED.about, cgpa=EXCLUDED.cgpa, sgpa_history=EXCLUDED.sgpa_history, photo_data=EXCLUDED.photo_data, updated_at=NOW()
      RETURNING user_id, full_name, college, branch, current_semester, about, cgpa, sgpa_history, photo_data, updated_at`;
    return res.status(200).json({profile:rows[0]});
  } catch (error) {
    console.error('Profile API operation failed:', error?.code || 'internal');
    const code=String(error?.code||'');
    if(code==='42P01')return res.status(503).json({error:'Profile database table missing.'});
    if(code==='42703')return res.status(503).json({error:'Profile database migration missing.'});
    if(code==='42501')return res.status(503).json({error:'Database permissions blocked cloud profile saving.'});
    return res.status(500).json({ error:'Cloud profile database request failed.' });
  }
}
