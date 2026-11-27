import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import initSqlJs from 'sql.js';
import OpenAI, { toFile } from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { agents as initialAgents, specialistPrompts, baseRules } from './agents.js';

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
// Add any new activities and refresh names/descriptions, keeping the owner's on/off choices.
for (const a of initialAgents) {
  db.run('INSERT OR IGNORE INTO agents(id,name,role,description,enabled) VALUES(?,?,?,?,?)',[a.id,a.name,a.role,a.description,a.enabled?1:0]);
  db.run('UPDATE agents SET name=?,role=?,description=? WHERE id=?',[a.name,a.role,a.description,a.id]);
}
const iconFor = id => initialAgents.find(a => a.id === id)?.icon || '🤖';
persist();
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins=(process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',');
app.use(cors({ origin: (origin,cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null,true) : cb(new Error('Origin not allowed')), methods: ['GET','POST'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '20mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));
const port = Number(process.env.PORT || 8787);
const realKey = v => v && !String(v).startsWith('replace');
// Groq (free tier) is preferred; OpenAI works too. XAI_API_KEY is kept for older deployments that stored the Groq key there.
const groqKey = [process.env.GROQ_API_KEY, process.env.XAI_API_KEY].find(realKey);
const provider = groqKey ? 'groq' : realKey(process.env.OPENAI_API_KEY) ? 'openai' : null;
const openai = provider === 'groq' ? new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
  : provider === 'openai' ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const models = provider === 'groq'
  ? { chat: process.env.AI_MODEL || 'openai/gpt-oss-120b', vision: process.env.VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct', stt: process.env.STT_MODEL || 'whisper-large-v3-turbo' }
  : { chat: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini', vision: process.env.VISION_MODEL || process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini', stt: process.env.STT_MODEL || 'whisper-1' };
let controlMode = 'running';
const addLog = (type, message) => { exec('INSERT INTO logs(id,type,message,at) VALUES(?,?,?,?)',[crypto.randomUUID(),type,String(message).slice(0,500),new Date().toISOString()]); };
const ownerCount = () => query('SELECT COUNT(*) AS n FROM owners')[0].n;
function auth(req,res,next){
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  try { if(!token) throw new Error(); req.owner=jwt.verify(token,process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({error:'Please sign in again.'}); }
}
app.get('/api/health',(_req,res)=>res.json({ok:true,mode:controlMode,apiConfigured:!!openai,provider,setupRequired:ownerCount()===0}));
app.post('/api/auth/setup',async(req,res)=>{
  if(ownerCount()!==0) return res.status(409).json({error:'Owner account is already configured.'});
  const {setupKey,email,password}=req.body||{};
  if(!process.env.OWNER_SETUP_KEY || setupKey!==process.env.OWNER_SETUP_KEY) return res.status(403).json({error:'Invalid first-run setup key.'});
  if(!/^\S+@\S+\.\S+$/.test(String(email||'')) || String(password||'').length<12) return res.status(400).json({error:'Enter a valid email and a password of at least 12 characters.'});
  const hash=await bcrypt.hash(password,12); exec('INSERT INTO owners(email,password_hash,created_at) VALUES(?,?,?)',[email.toLowerCase(),hash,new Date().toISOString()]);
  const owner=query('SELECT id,email FROM owners LIMIT 1')[0]; const token=jwt.sign({sub:String(owner.id),email:owner.email},process.env.JWT_SECRET,{expiresIn:'30d'}); addLog('security','Owner account created'); res.json({token,owner:{email:owner.email}});
});
app.post('/api/auth/login',async(req,res)=>{
  const email=String(req.body?.email||'').toLowerCase(); const owner=query('SELECT * FROM owners WHERE email=?',[email])[0];
  if(!owner || !(await bcrypt.compare(String(req.body?.password||''),owner.password_hash))) return res.status(401).json({error:'Email or password is incorrect.'});
  const token=jwt.sign({sub:String(owner.id),email:owner.email},process.env.JWT_SECRET,{expiresIn:'30d'}); res.json({token,owner:{email:owner.email}});
});
app.get('/api/auth/me',auth,(req,res)=>res.json({email:req.owner.email}));
app.get('/api/agents',auth,(_req,res)=>res.json({agents:query('SELECT id,name,role,description,enabled FROM agents').map(a=>({...a,icon:iconFor(a.id),enabled:!!a.enabled})),controlMode}));
app.get('/api/tasks',auth,(_req,res)=>res.json({tasks:query('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100'),logs:query('SELECT * FROM logs ORDER BY at DESC LIMIT 50')}));
app.post('/api/agents/:id/toggle',auth,(req,res)=>{
 const a=query('SELECT * FROM agents WHERE id=?',[req.params.id])[0]; if(!a)return res.status(404).json({error:'Agent not found'});
 const enabled=req.body?.enabled?1:0; if(a.id==='master'&&!enabled)return res.status(400).json({error:'Master Agent cannot be disabled.'});
 exec('UPDATE agents SET enabled=? WHERE id=?',[enabled,a.id]); addLog('control',`${a.name} ${enabled?'enabled':'disabled'}`); res.json({agent:{...a,enabled:!!enabled}});
});
app.post('/api/control',auth,(req,res)=>{const mode=req.body?.mode;if(!['pause','resume','stop'].includes(mode))return res.status(400).json({error:'Invalid control mode'});controlMode=mode==='resume'?'running':mode==='pause'?'paused':'stopped';addLog('control',`Master system ${controlMode}`);res.json({controlMode});});
const cleanHistory = list => (Array.isArray(list) ? list : []).slice(-20)
  .filter(m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
  .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));
app.post('/api/chat',auth,async(req,res)=>{
 const body=req.body||{};
 // Accepts either {message} (old clients) or {messages:[{role,content}]} with optional activity and image (data URL).
 const history=cleanHistory(body.messages||(body.message?[{role:'user',content:String(body.message)}]:[]));
 const image=typeof body.image==='string'&&/^data:image\/(png|jpe?g|webp|gif);base64,/.test(body.image)?body.image:null;
 if(!history.length||history.at(-1).role!=='user'){ if(!image) return res.status(400).json({error:'Message is required'}); history.push({role:'user',content:'Please look at this image and help me with it.'}); }
 const message=history.at(-1).content;
 if(controlMode!=='running')return res.status(423).json({error:`System is ${controlMode}. Resume it before sending tasks.`});
 if(!openai)return res.status(503).json({error:'Add GROQ_API_KEY (free at console.groq.com) or OPENAI_API_KEY to the server environment to enable AI responses.'});
 const enabled=query('SELECT id,name,description FROM agents WHERE enabled=1');
 const chosen=enabled.find(a=>a.id===body.activity&&a.id!=='master');
 const system=chosen
  ? `${specialistPrompts[chosen.id]||''}\nThe user opened the "${chosen.name}" activity: ${chosen.description}\n\n${baseRules}`
  : `You are AI Commander, a personal AI assistant that helps with every kind of daily activity. For each request, silently act as the best-fitting specialist below and give the most helpful answer.\n${enabled.filter(a=>a.id!=='master').map(a=>`- ${a.name}: ${specialistPrompts[a.id]||a.description}`).join('\n')}\n\n${baseRules}`;
 const msgs=[{role:'system',content:system+`\nToday's date: ${new Date().toISOString().slice(0,10)}.`},...history];
 if(image){ const last=msgs.at(-1); msgs[msgs.length-1]={role:'user',content:[{type:'text',text:last.content},{type:'image_url',image_url:{url:image}}]}; }
 try {
  const completion=await openai.chat.completions.create({model:image?models.vision:models.chat,messages:msgs,temperature:0.6,max_tokens:2048});
  const answer=(completion.choices?.[0]?.message?.content||'').trim()||'No text response returned.';
  const id=crypto.randomUUID(),createdAt=new Date().toISOString();
  exec('INSERT INTO tasks(id,request,answer,status,created_at) VALUES(?,?,?,?,?)',[id,(image?'[image] ':'')+message,answer,'completed',createdAt]);
  addLog('task',`${chosen?chosen.name:'Auto'}: ${message.slice(0,100)}`);
  res.json({answer,activity:chosen?.id||'master',task:{id,request:message,answer,status:'completed',created_at:createdAt}});
 }
 catch(err){console.error('AI_ERROR:',err.status,err.code,err.message);addLog('error',err.message);res.status(502).json({error:`AI request failed: ${err.status===401?'the API key is invalid':err.status===429?'rate limit reached, try again in a minute':'check the server log and API configuration'}.`});}
});
app.post('/api/transcribe',auth,async(req,res)=>{
 if(!openai)return res.status(503).json({error:'AI API is not configured on the server.'});
 const audio=String(req.body?.audio||''); const mimeType=String(req.body?.mimeType||'audio/m4a');
 if(!audio)return res.status(400).json({error:'No audio received.'});
 try {
  const buf=Buffer.from(audio,'base64'); if(buf.length>19*1024*1024) return res.status(413).json({error:'Recording is too long.'});
  const ext=(mimeType.split('/')[1]||'m4a').replace('mp4','m4a').replace('x-','');
  const result=await openai.audio.transcriptions.create({file:await toFile(buf,`voice.${ext}`,{type:mimeType}),model:models.stt});
  res.json({text:(result.text||'').trim()});
 } catch(err){console.error('STT_ERROR:',err.status,err.message);addLog('error','Transcription failed: '+err.message);res.status(502).json({error:'Could not understand the recording. Please try again.'});}
});
app.post('/api/voice/session',auth,async(req,res)=>{
 if(controlMode!=='running')return res.status(423).json({error:'Master system is not running.'});
 if(!realKey(process.env.OPENAI_API_KEY))return res.status(503).json({error:'Live realtime voice needs OPENAI_API_KEY. Use the microphone button in chat instead.'});
 try { const response=await fetch('https://api.openai.com/v1/realtime/client_secrets',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({session:{type:'realtime',model:process.env.OPENAI_REALTIME_MODEL||'gpt-realtime-2.1',instructions:'You are AI Commander, an owner-controlled personal assistant. Follow the user’s lawful requests, be transparent, and require explicit confirmation before consequential external actions. Do not claim to have performed actions without tool confirmation.',audio:{output:{voice:'marin'}}}})}); const secret=await response.json(); if(!response.ok) throw new Error('Realtime API rejected the session request'); res.set('Cache-Control','no-store'); res.json({value:secret.value,expires_at:secret.expires_at}); }
 catch(err){addLog('error','Realtime credential creation failed');res.status(502).json({error:'Could not start voice session. Check Realtime API access.'});}
});
const host=process.env.HOST||'127.0.0.1'; app.listen(port,host,()=>console.log(`AI Commander API listening on http://${host}:${port}`));
