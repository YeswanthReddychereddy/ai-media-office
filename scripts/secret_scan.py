"""Scan tracked worktree and every reachable Git blob without printing secrets."""
import re, subprocess, sys
patterns=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})',rb'AKIA[A-Z0-9]{16}',rb'sk-[A-Za-z0-9_-]{32,}',rb'(?i)(?:api_key|password|secret|token)\s*[:=]\s*[\"\x27][A-Za-z0-9+/=_-]{24,}[\"\x27]']
def git(*args):return subprocess.check_output(['git',*args],stderr=subprocess.DEVNULL)
fail=[]
for raw in git('ls-files','-z').split(b'\0'):
 if not raw:continue
 p=raw.decode(); parts=p.split('/')
 if (parts[-1].startswith('.env') and parts[-1]!='.env.example') or parts[-1].endswith(('.pem','.key','.sqlite','.db')):fail.append(p+' (forbidden file)')
 try:data=open(p,'rb').read()
 except FileNotFoundError:continue
 if any(re.search(x,data) for x in patterns):fail.append(p)
try:objects=git('rev-list','--objects','--all').splitlines()
except subprocess.CalledProcessError:objects=[]
seen=set()
for obj in objects:
 sha=obj.split(b' ')[0].decode()
 if sha in seen:continue
 seen.add(sha)
 if git('cat-file','-t',sha).strip()!=b'blob':continue
 if any(re.search(x,git('cat-file','blob',sha)) for x in patterns):fail.append('history blob '+sha)
if fail:
 print('Secret scan FAILED (values withheld):\n'+'\n'.join(fail));sys.exit(1)
print(f'Secret scan passed: tracked files and {len(seen)} reachable Git objects inspected. Review staged changes before publication.')
