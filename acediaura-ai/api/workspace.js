import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const sql=process.env.DATABASE_URL ? neon(process.env.DATABASE_URL):null;
const keys=process.env.NEON_AUTH_JWKS_URL ? createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL)):null;
const issuer=process.env.NEON_AUTH_BASE_URL ? new URL(process.env.NEON_AUTH_BASE_URL).origin:null;
const collections=['setup','subjects','topics','marks','sessions','profile'];
function safeData(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid workspace');
 const out={};
 for(const key of collections){
   const value=input[key];
   if(['subjects','topics','marks','sessions'].includes(key)){
     if(!Array.isArray(value)||value.length>4000)throw new Error('Invalid '+key);
     out[key]=value;
   }else{
     if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid '+key);
     out[key]=value;
   }
 }
 return out;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!sql||!keys||!issuer)return res.status(503).json({error:'Cloud database configuration incomplete'});
 if(req.method!=='GET'&&req.method!=='PUT')return res.status(405).json({error:'Method not allowed'});
 const auth=req.headers.authorization||'';
 if(!auth.startsWith('Bearer '))return res.status(401).json({error:'Authentication required'});
 let owner;
 try{const decoded=await jwtVerify(auth.slice(7),keys,{issuer});owner=decoded.payload.sub;if(typeof owner!=='string'||!owner)throw Error('no owner')}
 catch{return res.status(401).json({error:'Invalid cloud session'});}
 try{
  if(req.method==='GET'){
   const rows=await sql`SELECT content, updated_at FROM public.student_workspaces WHERE user_id=${owner} LIMIT 1`;
   return res.status(200).json({workspace:rows[0]?.content||null,updated_at:rows[0]?.updated_at||null});
  }
  const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const workspace=safeData(input?.workspace);
  const serialized=JSON.stringify(workspace);
  if(serialized.length>900000)return res.status(413).json({error:'Workspace exceeds 900 KB. Use a smaller profile image.'});
  const rows=await sql`INSERT INTO public.student_workspaces (user_id,content,updated_at)
    VALUES (${owner},${serialized}::jsonb,now())
    ON CONFLICT(user_id) DO UPDATE SET content=EXCLUDED.content,updated_at=now()
    RETURNING updated_at`;
  return res.status(200).json({saved:true,updated_at:rows[0].updated_at});
 }catch(e){
  console.error('Workspace request error',e?.code||'unknown');
  if(e?.code==='42P01')return res.status(503).json({error:'Run database migration 003_cloud_workspace.sql first'});
  return res.status(500).json({error:'Workspace could not be stored securely'});
 }
}
