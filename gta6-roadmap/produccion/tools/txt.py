import sys,re,html
s=open(sys.argv[1],encoding='utf-8',errors='ignore').read()
s=re.sub(r'(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>','',s)
s=re.sub(r'(?i)<br\s*/?>|</p>|</li>|</h\d>|</tr>','\n',s)
t=html.unescape(re.sub(r'<[^>]+>','',s))
out=[];seen=set()
for l in t.split('\n'):
    l=re.sub(r'\s+',' ',l).strip()
    if len(l)>25 and l not in seen: seen.add(l); out.append(l)
print('\n'.join(out))
