"""Offline Mandarin prototype speech. Requires espeak-ng and ffmpeg; not needed to run/build app.
ESPEAK_BIN, ESPEAK_DATA_PATH and LD_LIBRARY_PATH may select a local unpacked installation.
No network requests, browser speech service, or paid API.
"""
import json, os, subprocess, tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
animals=json.loads((root/'src/data/animals.json').read_text())
lines=[('hero-hello','主角','你好，森林里的小伙伴！',58),('hero-clue','主角','你能给我一个探险的提示吗？',58),('hero-thanks','主角','谢谢你！我们一起守护森林！',58)]
for i,animal in enumerate(animals):
 lines.extend([(f'animal-{i}-hello',animal['name'],f"你好！我是{animal['name']}，很高兴认识你！",65+i*3),(f'animal-{i}-clue',animal['name'],animal['hint'],65+i*3)])
manifest=[]
out=root/'public/audio/forest';out.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
 for id,speaker,text,pitch in lines:
  wav=Path(tmp)/'voice.wav'
  cmd=[os.environ.get('ESPEAK_BIN','espeak-ng')]
  if os.environ.get('ESPEAK_DATA_PATH'):cmd+=['--path='+os.environ['ESPEAK_DATA_PATH']]
  subprocess.run(cmd+['-v','cmn','-s','145','-p',str(pitch),'-w',str(wav),text],check=True,capture_output=True)
  dest=out/(id+'.mp3')
  subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-20:TP=-2:LRA=7','-ar','24000','-ac','1','-b:a','48k',str(dest)],check=True)
  duration=float(subprocess.check_output(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',str(dest)]))
  manifest.append({'id':id,'speaker':speaker,'text':text,'path':'audio/forest/'+id+'.mp3','language':'zh-CN','duration':round(duration,2),'source':'Original script; offline eSpeak NG synthesis'})
(root/'src/data/dialogue.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Generated {len(manifest)} bundled Mandarin lines, {sum(p.stat().st_size for p in out.glob("*.mp3"))} bytes')
