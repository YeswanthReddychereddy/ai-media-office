"""Install to the current user's Desktop and Application Support. No sudo.
Run only after the user has authorized these destination directories.
Existing data is preserved. Previous code/app bundles are archived on upgrade.
"""
import argparse,pathlib,shutil,sqlite3,plistlib,json,datetime,subprocess,os
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--node',required=True);p.add_argument('--ollama');p.add_argument('--bundle',required=True);p.add_argument('--stage-only',action='store_true');p.add_argument('--support');p.add_argument('--desktop');p.add_argument('--agents');args=p.parse_args()
home=pathlib.Path.home();source=pathlib.Path(args.source).resolve();support=pathlib.Path(args.support) if args.support else home/'Library/Application Support/AI Media Office';desktop=pathlib.Path(args.desktop) if args.desktop else home/'Desktop';agents=pathlib.Path(args.agents) if args.agents else home/'Library/LaunchAgents';stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
for f in [support,desktop,agents,support/'data',support/'logs',support/'runtime',support/'models']:f.mkdir(parents=True,exist_ok=True)
release=support/'releases'/stamp;release.mkdir(parents=True)
for item in source.iterdir():
 if item.name in ['.git','data','test-results','playwright-report'] or item.name.startswith('.env') or item.name.endswith('.tsbuildinfo'):continue
 if item.is_dir():shutil.copytree(item,release/item.name,symlinks=True)
 else:shutil.copy2(item,release/item.name)
current=support/'app'
if current.is_symlink():current.unlink()
elif current.exists():current.rename(support/('previous-app-'+stamp))
current.symlink_to(release,target_is_directory=True)
shutil.copy2(args.node,support/'runtime/node');(support/'runtime/node').chmod(0o755)
node_license=pathlib.Path(args.node).resolve().parent.parent/'LICENSE'
if node_license.exists():shutil.copy2(node_license,support/'runtime/NODE-LICENSE')
if args.ollama and not (support/'runtime/ollama').exists():shutil.copytree(args.ollama,support/'runtime/ollama',symlinks=True)
for db in ['company.sqlite','checkpoints.sqlite']:
 src=source/'data'/db;target=support/'data'/db
 if src.exists() and not target.exists():
  with sqlite3.connect(src) as read,sqlite3.connect(target) as write:read.backup(write)
config=support/'desktop-config.json'
if not config.exists():config.write_text(json.dumps({'port':4318,'modelPort':11435,'localModel':False,'model':'qwen3:1.7b','keepAwakeOnPower':True,'usageLimitPolicy':'hold-until-founder-resumes','paidFallback':False},indent=2)+'\n')
app=desktop/'AI Media Office.app'
if app.exists():app.rename(desktop/('AI Media Office previous '+stamp+'.app'))
shutil.copytree(args.bundle,app)
service=agents/'com.aimediaoffice.studio.plist'
if service.exists():shutil.copy2(service,support/('previous-service-'+stamp+'.plist'))
plist={'Label':'com.aimediaoffice.studio','ProgramArguments':[str(support/'runtime/node'),str(current/'scripts/desktop-supervisor.mjs'),str(support)],'WorkingDirectory':str(current),'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':10,'ProcessType':'Background','StandardOutPath':str(support/'logs/supervisor.log'),'StandardErrorPath':str(support/'logs/supervisor-error.log')}
service.write_bytes(plistlib.dumps(plist));service.chmod(0o644)
if not args.stage_only:
 subprocess.run(['/bin/launchctl','bootstrap',f'gui/{os.getuid()}',str(service)],check=True)
print(json.dumps({'app':str(app),'support':str(support),'service':str(service),'stagedOnly':args.stage_only},indent=2))
