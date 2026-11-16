"""python3 alinear.py voz.mp3 guion.txt salida.json  -> lista de palabras del guion con start/end (Whisper + alineado)."""
import sys, json, re, difflib, unicodedata
from faster_whisper import WhisperModel
def norm(w):
    w=unicodedata.normalize('NFD',w.lower()); w=''.join(c for c in w if unicodedata.category(c)!='Mn')
    return re.sub(r"[^a-z0-9]","",w)
mp3, txt, out = sys.argv[1:4]
texto = re.sub(r'\[[^\]]*\]','',open(txt).read()).split()
m = WhisperModel('small', device='cpu', compute_type='int8')
import subprocess, numpy as np
pcm=subprocess.run(['ffmpeg','-loglevel','error','-i',mp3,'-f','s16le','-ac','1','-ar','16000','-'],capture_output=True,check=True).stdout
audio=np.frombuffer(pcm,np.int16).astype(np.float32)/32768.0
segs,_ = m.transcribe(audio, language='es', word_timestamps=True, beam_size=5)
ww = [w for s in segs for w in s.words]
A=[norm(w.word) for w in ww]; B=[norm(w) for w in texto]
res=[None]*len(texto)
for tag,i1,i2,j1,j2 in difflib.SequenceMatcher(None,A,B,autojunk=False).get_opcodes():
    if tag=='equal':
        for k in range(i2-i1): res[j1+k]=(ww[i1+k].start,ww[i1+k].end)
    elif tag=='replace' and i2>i1:
        s,e=ww[i1].start,ww[i2-1].end; n=j2-j1
        for k in range(n): res[j1+k]=(s+(e-s)*k/n, s+(e-s)*(k+1)/n)
# rellenar huecos interpolando
for j in range(len(res)):
    if res[j] is None:
        p=next((res[k][1] for k in range(j-1,-1,-1) if res[k]),0.0)
        q=next((res[k][0] for k in range(j+1,len(res)) if res[k]),p+0.3)
        res[j]=(p,(p+q)/2 if q>p else p+0.15)
words=[{'text':t,'start':round(a,3),'end':round(b,3),'type':'word'} for t,(a,b) in zip(texto,res)]
json.dump(words,open(out,'w'),ensure_ascii=False)
ok=sum(1 for t in difflib.SequenceMatcher(None,A,B,autojunk=False).get_matching_blocks() for _ in range(t.size))
print(out, len(words),'palabras,', ok,'emparejadas, fin',words[-1]['end'])
