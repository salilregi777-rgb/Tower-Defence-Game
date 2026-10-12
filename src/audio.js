/** Quiet procedural forest ambience. Created only after an explicit user gesture. */
export class ForestAudio {
  constructor(){this.enabled=false;this.context=null;this.lastHit=0;}
  async toggle(){
    if(!this.context){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
      this.context=new Audio();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
      const size=this.context.sampleRate*3,buffer=this.context.createBuffer(1,size,this.context.sampleRate),data=buffer.getChannelData(0);let brown=0;
      for(let i=0;i<size;i++){brown=(brown+Math.random()*.04-.02)/1.015;data[i]=brown;}
      this.noise=this.context.createBufferSource();this.noise.buffer=buffer;this.noise.loop=true;
      const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=760;
      const gain=this.context.createGain();gain.gain.value=.18;this.noise.connect(filter).connect(gain).connect(this.master);this.noise.start();
      this.birdTimer=setInterval(()=>{if(this.enabled)this.tone(1100+Math.random()*1300,.13,.022,'sine',1.2);},4800);
    }
    await this.context.resume();this.enabled=!this.enabled;this.master.gain.setTargetAtTime(this.enabled?.24:0,this.context.currentTime,.2);return this.enabled;
  }
  tone(freq,duration,volume=.08,type='sine',bend=.5){if(!this.enabled)return;const t=this.context.currentTime,osc=this.context.createOscillator(),g=this.context.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*bend,t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(g).connect(this.master);osc.start(t);osc.stop(t+duration);osc.onended=()=>{osc.disconnect();g.disconnect();};}
  effect(e){if(!this.enabled)return;
    if(e.type==='shot')this.tone(e.towerType==='cannon'?95:620,.09,.03,'triangle');
    if(e.type==='damage'&&this.context.currentTime-this.lastHit>.12){this.lastHit=this.context.currentTime;this.tone(150,.06,.014,'sine');}
    if(e.type==='placement')this.tone(340,.65,.09,'sine',2);
    if(e.type==='wave-complete'||e.type==='victory'){this.tone(440,.7,.10,'sine',1.5);setTimeout(()=>this.tone(660,.8,.08,'sine',1.33),180);}
    if(e.type==='leak')this.tone(140,.35,.08,'triangle',.5);
    if(e.type==='lightning')this.tone(920,.12,.035,'sawtooth',.3);
  }
  dispose(){clearInterval(this.birdTimer);this.context?.close();}
}
