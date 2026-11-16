"""Corta un clip vertical 1080x1920 de un vídeo horizontal (p. ej. el tráiler 4K oficial).
Uso: python3 cortar_clip.py ENTRADA.mp4 SALIDA.mp4 INICIO_S DURACION_S CENTRO_X(0-1)
CENTRO_X: 0.5 = centro; 0.2 = encuadre hacia la izquierda; 0.8 = hacia la derecha.
Regla del canal: DURACION <= 3 s y sin audio."""
import subprocess, sys
src, dst, ini, dur, cx = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
assert dur <= 3.2, "Máximo 3 s por clip de material oficial"
vf = f"crop=ih*9/16:ih:(iw-ih*9/16)*{cx}:0,scale=1080:1920,fps=30,format=yuv420p"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(ini), "-i", src, "-t", str(dur),
                "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-an", dst], check=True)
