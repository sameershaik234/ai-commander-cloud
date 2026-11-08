import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import initSqlJs from 'sql.js';
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { agents as initialAgents, specialistPrompts } from './agents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace_')) throw new Error('Set a unique JWT_SECRET of at least 32 characters in server/.env');
if (!process.env.OWNER_SETUP_KEY || process.env.OWNER_SETUP_KEY.startsWith('replace_')) throw new Error('Set a unique OWNER_SETUP_KEY in server/.env');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data'));
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'commander.sqlite');
const SQL = await initSqlJs();
const db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
db.run(`PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS owners(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, description TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, request TEXT NOT NULL, answer TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS logs(id TEXT PRIMARY KEY, type TEXT NOT NULL, message TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
const persist = () => fs.writeFileSync(dbPath, Buffer.from(db.export()), { mode: 0o600 });
const query = (sql, params = []) => { const s = db.prepare(sql); s.bind(params); const rows=[]; while(s.step()) rows.push(s.getAsObject()); s.free(); return rows; };
const exec = (sql, params = []) => { db.run(sql, params); persist(); };
if (query('SELECT id FROM agents').length === 0) for (const a of initialAgents) db.run('INSERT INTO agents(id,name,role,description,enabled) VALUES(?,?,?,?,?)',[a.id,a.name,a.role,a.description,a.enabled?1:0]);
persist();
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins=(process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',');
app.use(cors({ origin: (origin,cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null,true) : cb(new Error('Origin not allowed')), methods: ['GET','POST'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));
const port = Number(process.env.PORT || 8787);
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'replace_me' ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
let controlMode = 'running';
const addLog = (type, message) => { exec('INSERT INTO logs(id,type,message,at) VALUES(?,?,?,?)',[crypto.randomUUID(),type,String(message).slice(0,500),new Date().toISOString()]); };
const ownerCount = () => query('SELECT COUNT(*) AS n FROM owners')[0].n;
function auth(req,res,next){
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  try { if(!token) throw new Error(); req.owner=jwt.verify(token,process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({error:'Please sign in again.'}); }
}
app.get('/api/health',(_req,res)=>res.json({ok:true,mode:controlMode,apiConfigured:!!openai,setupRequired:ownerCount()===0}));
app.post('/api/auth/setup',async(req,res)=>{
  if(ownerCount()!==0) return res.status(409).json({error:'Owner account is already configured.'});
  const {setupKey,email,password}=req.body||{};
  if(!process.env.OWNER_SETUP_KEY || setupKey!==process.env.OWNER_SETUP_KEY) return res.status(403).json({error:'Invalid first-run setup key.'});
  if(!/^\S+@\S+\.\S+$/.test(String(email||'')) || String(password||'').length<12) return res.status(400).json({error:'Enter a valid email and a password of at least 12 characters.'});
  const hash=await bcrypt.hash(password,12); exec('INSERT INTO owners(email,password_hash,created_at) VALUES(?,?,?)',[email.toLowerCase(),hash,new Date().toISOString()]);
  const owner=query('SELECT id,email FROM owners LIMIT 1')[0]; const token=jwt.sign({sub:String(owner.id),email:owner.email},process.env.JWT_SECRET,{expiresIn:'12h'}); addLog('security','Owner account created'); res.json({token,owner:{email:owner.email}});
});
app.post('/api/auth/login',async(req,res)=>{
  const email=String(req.body?.email||'').toLowerCase(); const owner=query('SELECT * FROM owners WHERE email=?',[email])[0];
  if(!owner || !(await bcrypt.compare(String(req.body?.password||''),owner.password_hash))) return res.status(401).json({error:'Email or password is incorrect.'});
  const token=jwt.sign({sub:String(owner.id),email:owner.email},process.env.JWT_SECRET,{expiresIn:'12h'}); res.json({token,owner:{email:owner.email}});
});
app.get('/api/auth/me',auth,(req,res)=>res.json({email:req.owner.email}));
app.get('/api/agents',auth,(_req,res)=>res.json({agents:query('SELECT id,name,role,description,enabled FROM agents').map(a=>({...a,enabled:!!a.enabled})),controlMode}));
app.get('/api/tasks',auth,(_req,res)=>res.json({tasks:query('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100'),logs:query('SELECT * FROM logs ORDER BY at DESC LIMIT 50')}));
app.post('/api/agents/:id/toggle',auth,(req,res)=>{
 const a=query('SELECT * FROM agents WHERE id=?',[req.params.id])[0]; if(!a)return res.status(404).json({error:'Agent not found'});
 const enabled=req.body?.enabled?1:0; if(a.id==='master'&&!enabled)return res.status(400).json({error:'Master Agent cannot be disabled.'});
 exec('UPDATE agents SET enabled=? WHERE id=?',[enabled,a.id]); addLog('control',`${a.name} ${enabled?'enabled':'disabled'}`); res.json({agent:{...a,enabled:!!enabled}});
});
app.post('/api/control',auth,(req,res)=>{const mode=req.body?.mode;if(!['pause','resume','stop'].includes(mode))return res.status(400).json({error:'Invalid control mode'});controlMode=mode==='resume'?'running':mode==='pause'?'paused':'stopped';addLog('control',`Master system ${controlMode}`);res.json({controlMode});});
app.post('/api/chat',auth,async(req,res)=>{
 const message=String(req.body?.message||'').trim(); if(!message)return res.status(400).json({error:'Message is required'});
 if(controlMode!=='running')return res.status(423).json({error:`System is ${controlMode}. Resume it before sending tasks.`});
 if(!openai)return res.status(503).json({error:'Add OPENAI_API_KEY to server/.env to enable AI responses.'});
 const enabled=query('SELECT id,name,description FROM agents WHERE enabled=1 AND id<>\'master\'');
 const prompt=`You are AI Commander, the owner's master AI agent. Select the most relevant enabled specialist and say which one you selected. Available specialists: ${enabled.map(a=>`${a.id}: ${a.name} — ${a.description}. ${specialistPrompts[a.id]||''}`).join('\n')}\n\nRules: obey lawful owner instructions within safety boundaries; never claim external actions without tool confirmation; require explicit owner approval before sending messages, purchasing, payments, refunds, deletion, publishing, deployment or account changes; do not self-delete or bypass owner controls; explain uncertainty.\n\nOwner request: ${message}`;
 try { const response=await openai.responses.create({model:process.env.OPENAI_MODEL||'gpt-6.1-sol',input:prompt}); const answer=response.output_text||'No text response returned.'; const id=crypto.randomUUID(),createdAt=new Date().toISOString(); exec('INSERT INTO tasks(id,request,answer,status,created_at) VALUES(?,?,?,?,?)',[id,message,answer,'completed',createdAt]); addLog('task',`Completed request: ${message.slice(0,100)}`); res.json({answer,task:{id,request:message,answer,status:'completed',created_at:createdAt}}); }
 catch(err){addLog('error',err.message);res.status(502).json({error:'OpenAI request failed. Check the server log and API configuration.'});}
});
app.post('/api/voice/session',auth,async(req,res)=>{
 if(controlMode!=='running')return res.status(423).json({error:'Master system is not running.'});
 if(!openai)return res.status(503).json({error:'OpenAI API is not configured.'});
 try { const response=await fetch('https://api.openai.com/v1/realtime/client_secrets',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({session:{type:'realtime',model:process.env.OPENAI_REALTIME_MODEL||'gpt-realtime-2.1',instructions:'You are AI Commander, an owner-controlled personal assistant. Follow the user’s lawful requests, be transparent, and require explicit confirmation before consequential external actions. Do not claim to have performed actions without tool confirmation.',audio:{output:{voice:'marin'}}}})}); const secret=await response.json(); if(!response.ok) throw new Error('Realtime API rejected the session request'); res.set('Cache-Control','no-store'); res.json({value:secret.value,expires_at:secret.expires_at}); }
 catch(err){addLog('error','Realtime credential creation failed');res.status(502).json({error:'Could not start voice session. Check Realtime API access.'});}
});
const host=process.env.HOST||'127.0.0.1'; app.listen(port,host,()=>console.log(`AI Commander API listening on http://${host}:${port}`));
