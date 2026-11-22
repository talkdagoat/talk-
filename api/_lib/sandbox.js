import {Sandbox,Drive} from '@vercel/sandbox';
import {sandboxName,driveName,vncToken} from './auth.js';
const SIZE=1024*1024*1024;
export async function getUserSandbox(p){const snap=process.env.LINUX_BASE_SNAPSHOT_ID;if(!snap)throw new Error('Linux base snapshot is not configured');const drive=await Drive.getOrCreate({name:driveName(p),region:'bom1',maxSize:SIZE});const box=await Sandbox.getOrCreate({name:sandboxName(p),source:{type:'snapshot',snapshotId:snap},ports:[6080],region:'bom1',persistent:false,resources:{vcpus:2},timeout:45*60*1000,networkPolicy:'allow-all',mounts:{'/mnt/cloud-user-data':drive}});return{box,drive}}
export async function startDesktop(box,p){
 const token=vncToken(p);
 const lines=[
 'set -Eeuo pipefail',
 'export HOME=/home/ubuntu DISPLAY=:1 XDG_RUNTIME_DIR=/tmp/runtime-ubuntu',
 'mkdir -p "$XDG_RUNTIME_DIR" /tmp/.X11-unix',
 'chmod 700 "$XDG_RUNTIME_DIR"',
 'test -x /opt/private-linux/start-desktop.sh || { echo "Desktop startup script is missing"; exit 1; }',
 '/opt/private-linux/start-desktop.sh',
 'if [[ ! -S /tmp/cloud-linux-dbus ]]; then rm -f /tmp/cloud-linux-dbus; dbus-daemon --session --fork --address=unix:path=/tmp/cloud-linux-dbus; fi',
 'export DBUS_SESSION_BUS_ADDRESS=unix:path=/tmp/cloud-linux-dbus',
 'export GLYCIN_LOADERS_ALLOW_UNSANDBOXED=1',
 'pgrep -x openbox >/dev/null 2>&1 || (nohup openbox --replace >/tmp/openbox.log 2>&1 &)',
 'pkill -x pcmanfm >/dev/null 2>&1 || true',
 'nohup env DBUS_SESSION_BUS_ADDRESS="$DBUS_SESSION_BUS_ADDRESS" GLYCIN_LOADERS_ALLOW_UNSANDBOXED=1 pcmanfm --desktop >/tmp/pcmanfm.log 2>&1 </dev/null &',
 'pkill -x lxpanel >/dev/null 2>&1 || true',
 'nohup env DBUS_SESSION_BUS_ADDRESS="$DBUS_SESSION_BUS_ADDRESS" GLYCIN_LOADERS_ALLOW_UNSANDBOXED=1 lxpanel -p default >/tmp/lxpanel.log 2>&1 </dev/null &',
 'sleep 1',
 'pgrep -x openbox >/dev/null',
 'pgrep -x lxpanel >/dev/null',
 'curl -fsS http://127.0.0.1:6080/vnc.html >/dev/null'
 ];
 const r=await box.runCommand({cmd:'bash',args:['-lc',lines.join('\n')],env:{HOME:'/home/ubuntu',DISPLAY:':1',NOVNC_TOKEN:token},timeoutMs:30000});
 if(r.exitCode!==0)throw new Error('Linux desktop failed to start its window manager or browser stream. Try launching again.');
}
