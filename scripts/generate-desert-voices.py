"""Offline original Mandarin prototype dialogue; requires eSpeak NG and FFmpeg only for authoring."""
from pathlib import Path
import json,os,subprocess,tempfile
root=Path(__file__).resolve().parents[1]
# Authoritative original scripts / speaker mapping; keep IDs stable.
source=json.loads((root/'src/data/desert-dialogue.json').read_text())
lines=[(l['id'],l['speaker'],l['text'],58 if l['speaker']=='骞骞' else 68) for l in source]
manifest=[];out=root/'public/audio/desert';out.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();
with tempfile.TemporaryDirectory() as tmp:
 for id,speaker,text,pitch in lines:
  wav=Path(tmp)/'voice.wav';dest=out/(id+'.mp3')
  subprocess.run([os.environ.get('ESPEAK_BIN','espeak-ng'),*(['--path='+os.environ['ESPEAK_DATA_PATH']] if os.environ.get('ESPEAK_DATA_PATH') else []),'-v','cmn','-s','145','-p',str(pitch),'-w',str(wav),text],env=env,check=True,capture_output=True)
  subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-20:TP=-2:LRA=7','-ar','24000','-ac','1','-b:a','48k',str(dest)],check=True)
  manifest.append({'id':id,'speaker':speaker,'text':text,'path':'audio/desert/'+id+'.mp3','language':'zh-CN','source':'Original script; offline eSpeak NG synthesis'})
(root/'src/data/desert-dialogue.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Generated',len(manifest),'Mandarin lines')
