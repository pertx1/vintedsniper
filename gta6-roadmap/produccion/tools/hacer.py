"""Monta un vídeo GTA Oculto a partir de una ficha corta.

Uso:  python3 hacer.py ficha.json [--still t1,t2,...] [--render]

Ficha:
{
 "id": "S4", "tipo": "short" | "largo",
 "voz": "voz-s4.mp3",              # en render/public
 "words": "/ruta/words.json",       # transcripción Scribe (lista o {"words": [...]})
 "fin": 0.7,                        # segundos tras la última palabra
 "planos": [ {"a": "palabra ancla", <visual>}, ... ],
 "booms": ["ancla", ...], "claves": ["palabra", ...],
 "flami": ["ancla", ...]            # apariciones extra (siempre hay una al inicio y otra al final en shorts)
}
Visual:
 {"clip": "trailer-18", "ss": 0.0, "cx": 0.5, "top": "..."}   clip de render/public/h (se corta/ralentiza solo)
 {"img": "p2/xxx.jpg", "top": "..."}                            imagen
 {"sello": "TEXTO", "acc": "#FFE02E", "g": -6, "img"|"clip": ...}
 {"tpl": "gta-dato"|"gta-sinopsis"|..., ...props}              plantilla tal cual
 {"ficha": "Nombre", "img": ..., "sub": "...", "bot": "..."}  gta-personaje
 {"cita": "texto", "quien": "...", "donde": "..."}            gta-cita
"""
import json, os, re, subprocess, sys, unicodedata

SP = "/tmp/claude-0/-home-user-vintedsniper/f149cbb4-300b-549b-a6bb-754b879e5cbb/scratchpad"
R = SP + "/render"
PUB = R + "/public"
CHROME = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"


def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9$']", "", w)


def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode().strip())


def cortar(vid, ss, d, cx, vertical, nombre):
    """Corta (y si hace falta ralentiza) un clip a d segundos exactos. Devuelve la ruta relativa a public."""
    src = f"{PUB}/h/{vid}.mp4"
    disp = dur(src) - ss - 0.05
    lento = max(1.0, (d + 0.1) / disp)
    if lento > 3.0:
        raise SystemExit(f"Clip {vid} demasiado corto para {d:.2f}s (hay {disp:.2f}s)")
    out_rel = f"gen/{nombre}.mp4"
    out = f"{PUB}/{out_rel}"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    vf = []
    if vertical:
        vf.append(f"crop=ih*9/16:ih:(iw-ih*9/16)*{cx}:0,scale=1080:1920")
    if lento > 1.0:
        vf.append(f"minterpolate=fps=60,setpts={lento:.3f}*PTS")
    vf.append("fps=30,format=yuv420p")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(ss), "-t", f"{(d + 0.1) / lento:.3f}", "-i", src,
                    "-vf", ",".join(vf), "-t", f"{d + 0.1:.3f}", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out], check=True)
    return out_rel


def recorte(img, cx, nombre):
    """En vertical, recorta una imagen horizontal a 9:16 centrada en cx."""
    from PIL import Image
    im = Image.open(f"{PUB}/{img}")
    w, h = im.size
    if w / h <= 0.7:
        return img
    cw = int(h * 9 / 16)
    x = max(0, min(w - cw, int(cx * w - cw / 2)))
    out_rel = f"gen/{nombre}.jpg"
    os.makedirs(f"{PUB}/gen", exist_ok=True)
    im.convert("RGB").crop((x, 0, x + cw, h)).resize((1080, 1920)).save(f"{PUB}/{out_rel}", quality=90)
    return out_rel


def main():
    ficha = json.load(open(sys.argv[1]))
    vid_id, tipo = ficha["id"], ficha.get("tipo", "short")
    vertical = tipo == "short"
    W = json.load(open(ficha["words"]))
    W = W["words"] if isinstance(W, dict) else W
    W = [w for w in W if w.get("type", "word") == "word" and not w["text"].startswith("[")]
    toks = [norm(w["text"]) for w in W]

    pos = 0

    def ancla(txt, desde=None):
        nonlocal pos
        p = pos if desde is None else desde
        q = [norm(x) for x in txt.split() if norm(x)]
        for i in range(p, len(toks) - len(q) + 1):
            if toks[i:i + len(q)] == q:
                if desde is None:
                    pos = i + 1
                return i
        raise SystemExit(f"[{vid_id}] ancla no encontrada tras palabra {p}: '{txt}'")

    fin = W[-1]["end"] + ficha.get("fin", 0.7)
    starts = []
    for i, p in enumerate(ficha["planos"]):
        starts.append(0.0 if i == 0 else W[ancla(p["a"])]["start"])
    # secciones con "lista": se reparten el tiempo a partes iguales
    exp, exp_starts = [], []
    for i, p in enumerate(ficha["planos"]):
        fin_i = starts[i + 1] if i + 1 < len(starts) else fin
        if "lista" in p:
            n = len(p["lista"])
            for k, q in enumerate(p["lista"]):
                exp.append(q); exp_starts.append(starts[i] + (fin_i - starts[i]) * k / n)
        else:
            exp.append(p); exp_starts.append(starts[i])
    ficha["planos"], starts = exp, exp_starts
    planos = []
    for i, p in enumerate(ficha["planos"]):
        d = round((starts[i + 1] if i + 1 < len(starts) else fin) - starts[i], 3)
        if d <= 0.25:
            raise SystemExit(f"[{vid_id}] plano {i} ('{p.get('a')}') dura {d}s")
        nombre = f"{vid_id}_{i:02d}"
        top = p.get("top")
        bg = {}
        if "clip" in p:
            bg = {"videoUrl": cortar(p["clip"], p.get("ss", 0.0), d, p.get("cx", 0.5), vertical, nombre)}
        elif "img" in p:
            bg = {"imageUrl": recorte(p["img"], p.get("cx", 0.5), nombre) if vertical else p["img"]}
        if "sello" in p:
            x = {"plantilla": "gta-sello", "text": p["sello"], "accent": p.get("acc", "#FFE02E"), "grado": p.get("g", -6), **bg}
        elif "ficha" in p:
            x = {"plantilla": "gta-personaje", "imageUrl": bg.get("imageUrl", p["img"]), "text": p["ficha"], "topText": p.get("sub", ""), "bottomText": p.get("bot", ""), "grado": p.get("g", 1)}
        elif "cita" in p:
            x = {"plantilla": "gta-cita", "text": p["cita"], "topText": p.get("quien", ""), "bottomText": p.get("donde", "web oficial de Rockstar")}
        elif "tpl" in p:
            x = {k: v for k, v in p.items() if k not in ("a", "tpl")}
            x["plantilla"] = p["tpl"]
            if p["tpl"] == "gta-dato":
                x.setdefault("lang", "es"); x.setdefault("fijo", False)
        else:
            x = {"plantilla": "gta-plano", **bg}
            if top:
                x["topText"] = top
        x["segundos"] = d
        planos.append(x)

    booms = [0.0] + [W[ancla(b, 0)]["start"] for b in ficha.get("booms", [])]
    if vertical:
        fl = [{"desde": 0.0, "hasta": 1.5, "x": 740, "y": 1080, "h": 440, "rot": -8}]
        for k, a in enumerate(ficha.get("flami", [])):
            t = W[ancla(a, 0)]["start"]
            fl.append({"desde": t + 0.05, "hasta": t + 1.3, "x": 690, "y": 1180, "h": 520, "rot": 10 if k % 2 == 0 else -10})
        fl.append({"desde": starts[-1] + 0.05, "hasta": fin, "x": 590, "y": 1060, "h": 780, "rot": -4})
    else:
        fl = [{"desde": 0.1, "hasta": 2.2, "x": 1500, "y": 560, "h": 480, "rot": -8}]
        for k, a in enumerate(ficha.get("flami", [])):
            t = W[ancla(a, 0)]["start"]
            fl.append({"desde": t + 0.05, "hasta": t + 3.0, "x": 1520, "y": 580, "h": 440, "rot": 6 if k % 2 == 0 else -6})
        fl.append({"desde": starts[-1] + 0.05, "hasta": fin - 0.1, "x": 1480, "y": 520, "h": 520, "rot": -4})
    datos = {"voz": ficha["voz"], "planos": planos, "palabras": [[w["text"], w["start"], w["end"]] for w in W],
             "claves": ficha.get("claves", []), "booms": booms, "flami": fl}
    json.dump(datos, open(f"{R}/src/gen/{vid_id}.json", "w"), ensure_ascii=False, indent=1)

    # índice de composiciones generadas
    ids = sorted(f[:-5] for f in os.listdir(f"{R}/src/gen") if f.endswith(".json"))
    tipos = json.load(open(f"{R}/src/gen/tipos.idx")) if os.path.exists(f"{R}/src/gen/tipos.idx") else {}
    tipos[vid_id] = tipo
    json.dump(tipos, open(f"{R}/src/gen/tipos.idx", "w"))
    lines = ["// generado por hacer.py", "import { DatosShort } from \"../ShortGTAOculto\";"]
    for i in ids:
        lines.append(f"import d_{i} from \"./{i}.json\";")
    lines.append("export const GENERADOS: { id: string; tipo: string; datos: DatosShort }[] = [")
    for i in ids:
        lines.append(f"  {{ id: \"{i}\", tipo: \"{tipos.get(i, 'short')}\", datos: d_{i} as unknown as DatosShort }},")
    lines.append("];")
    open(f"{R}/src/gen/index.ts", "w").write("\n".join(lines) + "\n")
    print(f"{vid_id}: {len(planos)} planos, {fin:.2f}s")

    args = sys.argv[2:]
    if "--still" in args:
        ts = args[args.index("--still") + 1].split(",")
        os.makedirs(f"{R}/out/chk", exist_ok=True)
        for t in ts:
            subprocess.run(["npx", "remotion", "still", "src/index.ts", vid_id, f"out/chk/{vid_id}_{t}.jpg", f"--frame={int(float(t) * 30)}",
                            f"--browser-executable={CHROME}", "--log=error", "--scale=0.3"], cwd=R, check=True, capture_output=True)
        from PIL import Image
        ims = [Image.open(f"{R}/out/chk/{vid_id}_{t}.jpg") for t in ts]
        w, h = ims[0].size
        cols = min(6, len(ims))
        S = Image.new("RGB", (cols * w, ((len(ims) + cols - 1) // cols) * h))
        for k, im in enumerate(ims):
            S.paste(im, ((k % cols) * w, (k // cols) * h))
        S.save(f"{R}/out/chk/{vid_id}_sheet.jpg")
        print(f"{R}/out/chk/{vid_id}_sheet.jpg")
    if "--render" in args:
        subprocess.run(["npx", "remotion", "render", "src/index.ts", vid_id, f"out/{vid_id}.mp4", f"--browser-executable={CHROME}",
                        "--concurrency=4", "--log=error"], cwd=R, check=True, capture_output=True)
        os.makedirs(f"{SP}/entregas", exist_ok=True)
        br = ["-b:v", "2600k", "-maxrate", "3200k", "-bufsize", "5000k"] if vertical else ["-b:v", "4000k", "-maxrate", "6000k", "-bufsize", "8000k"]
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{R}/out/{vid_id}.mp4", "-c:v", "libx264", *br, "-c:a", "aac", "-b:a", "160k",
                        "-movflags", "+faststart", f"{SP}/entregas/{vid_id}-gtaoculto.mp4"], check=True)
        print("OK", f"{SP}/entregas/{vid_id}-gtaoculto.mp4")


if __name__ == "__main__":
    main()
