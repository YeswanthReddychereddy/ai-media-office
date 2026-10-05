"""Package an original native WebKit shell, with an original code-drawn icon."""
import argparse,pathlib,plistlib,shutil,struct,zlib,math
parser=argparse.ArgumentParser();parser.add_argument('--binary',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
bundle=pathlib.Path(args.output);(bundle/'Contents/MacOS').mkdir(parents=True,exist_ok=True);(bundle/'Contents/Resources').mkdir(exist_ok=True)
shutil.copy2(args.binary,bundle/'Contents/MacOS/MediaOffice');(bundle/'Contents/MacOS/MediaOffice').chmod(0o755)
info={'CFBundleExecutable':'MediaOffice','CFBundleIdentifier':'com.aimediaoffice.desktop','CFBundleName':'AI Media Office','CFBundleDisplayName':'AI Media Office','CFBundlePackageType':'APPL','CFBundleShortVersionString':'0.2.0','CFBundleVersion':'2','CFBundleIconFile':'Studio','LSMinimumSystemVersion':'13.0','NSHighResolutionCapable':True,'NSAppTransportSecurity':{'NSAllowsLocalNetworking':True},'NSHumanReadableCopyright':'AI Media Office contributors. MIT license.'}
(bundle/'Contents/Info.plist').write_bytes(plistlib.dumps(info))
def png(size):
 rows=[]
 for y in range(size):
  row=bytearray()
  for x in range(size):
   a=x/size;b=y/size
   # Rounded olive field and three architectural line forms.
   corner=max(abs(a-.5)-.33,0)**2+max(abs(b-.5)-.33,0)**2
   alpha=255 if corner<.14**2 else 0
   rgb=(int(35+20*(1-b)),int(46+25*(1-b)),int(29+15*(1-b)))
   def edge(x1,y1,x2,y2,w=.014):return x1<=a<=x2 and y1<=b<=y2 and (a<x1+w or a>x2-w or b<y1+w or b>y2-w)
   line=edge(.23,.38,.42,.73) or edge(.42,.25,.65,.73) or edge(.65,.43,.78,.73)
   window=any(abs(a-c)<.015 and abs(b-d)<.014 for c in [.30,.35,.50,.57,.71] for d in [.45,.52,.60])
   if line or window:rgb=(196,214,162)
   row.extend((*rgb,alpha))
  rows.append(b'\x00'+row)
 def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
chunks=[]
for tag,size in [(b'ic07',128),(b'ic08',256),(b'ic09',512)]:
 data=png(size);chunks.append(tag+struct.pack('>I',len(data)+8)+data)
body=b''.join(chunks);(bundle/'Contents/Resources/Studio.icns').write_bytes(b'icns'+struct.pack('>I',len(body)+8)+body)
print(bundle)
