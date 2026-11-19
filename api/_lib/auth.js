import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const TTL=180*24*60*60*1000;
function secret(){const s=process.env.LINUX_MASTER_SECRET;if(!s||s.length<32)throw new Error('LINUX_MASTER_SECRET is missing');return s}
function sign(v){return createHmac('sha256',secret()).update(v).digest('base64url')}
export function issueAccessKey(name){const now=Date.now(),p={v:1,id:randomBytes(18).toString('base64url'),name,iat:now,exp:now+TTL},b=Buffer.from(JSON.stringify(p)).toString('base64url');return{accessKey:'plx_'+b+'.'+sign(b),name,expiresAt:p.exp}}
export function requireAccessKey(req,res){const h=req.headers.authorization||'',t=h.startsWith('Bearer ')?h.slice(7).trim():'';const m=/^plx_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(t);if(!m){res.status(401).json({error:'Access key missing or invalid.'});return null}try{const a=Buffer.from(sign(m[1])),b=Buffer.from(m[2]);if(a.length!==b.length||!timingSafeEqual(a,b))throw Error();const p=JSON.parse(Buffer.from(m[1],'base64url').toString());if(p.v!==1||p.exp<=Date.now())throw Error();return p}catch{res.status(401).json({error:'Access key expired or invalid.'});return null}}
export function setCors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Max-Age','600')}
export function requireMethod(req,res,m){setCors(res);if(req.method==='OPTIONS'){res.status(204).end();return false}if(req.method!==m){res.status(405).json({error:'Method not allowed'});return false}return true}
export const sandboxName=p=>'linux-'+p.id,driveName=p=>'linux-data-'+p.id,vncToken=p=>createHmac('sha256',secret()).update('novnc:'+p.id).digest('hex');
