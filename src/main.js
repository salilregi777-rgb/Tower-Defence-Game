import {GameEngine,TOWER_TYPES} from './game/engine.js';
import {createGameUI} from './ui/game-ui.js';
import {createGameScene} from './rendering/game-scene.js';
import {ForestAudio} from './audio.js';

const engine=new GameEngine(),audio=new ForestAudio();
let world,view,ui,progress=0,destination=0,mode='home',buildType=null,lastUI=0,wasPaused=false,qualityClock=0,qualityFrames=0,slowWindows=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const abort=new AbortController(),signal=abort.signal;
const $=s=>document.querySelector(s);
const dialog=document.createElement('dialog');dialog.className='sylva-dialog game-ui';document.body.append(dialog);
let guideWasPaused=false;
dialog.addEventListener('close',()=>{if(mode==='game')engine.paused=guideWasPaused;});
function showHelp(journal=false){
 guideWasPaused=engine.paused;if(mode==='game')engine.paused=true;
 dialog.innerHTML=`<button class="close-dialog" aria-label="Close guide">×</button><p class="eyebrow">SYLVA / ${journal?'THE LIVING ARCHIVE':'FIELD GUIDE 01'}</p><h2>${journal?'A forest of<br>living algorithms.':'Small guardians.<br>A world worth saving.'}</h2><p>${journal?'Every movement has a structure beneath it. Open the DSA Inspector during play to watch the actual queue, linked list, heap, trees, and stacks change as the forest fights back.':'The blight follows the pale trail toward the sacred tree. Plant guardians beside the path, nurture their branches, and keep the heart of the grove alive for ten waves.'}</p><div class="sylva-guide-grid">${(journal?[
 ['01 / Queue + breadth-first search','A circular queue explores the 2D battlefield to validate the route. A second FIFO queue schedules each incoming wave.'],
 ['02 / Heap + binary search tree','A max heap selects targets in range. Projectiles look up moving enemies by unique ID in an ordinary BST.'],
 ['03 / Linked list + two stacks','Shots enter and leave a linked list. Undo and redo reverse your construction decisions without rewinding the battle.'],
 ['04 / Binary tree + B-tree','Branching upgrades change real tower stats. A splitting B-tree indexes completed wave records in local storage.']
 ]:[['01 / Take root','Choose a guardian below, then select open ground. Its luminous circle shows the reach of its attacks.'],['02 / Hold the trail','Start each wave when ready. Archer pierces; Mortar bursts; Frost slows; Storm chains. Bosses arrive in waves 5 and 10.'],['03 / Grow with intention','Select a planted tower to upgrade a branch or change its targeting. Reclaim seeds by selling. Undo and redo remain available.'],['04 / Read the forest','Drag open terrain to pan, scroll or use + / − to zoom. Space pauses, 1–4 choose towers, Escape clears a choice.']]).map(([a,b])=>`<article><b>${a}</b><p>${b}</p></article>`).join('')}</div><button class="begin">${mode==='home'?'Enter the grove ↗':'Return to the grove'}</button><p class="source-credit">Original Sylva environment by <a href="https://threeui.com/hero/sylva/living-green" target="_blank" rel="noopener">ThreeUI / DesignCode</a>. Extended into an interactive tower defense world.</p>`;
 dialog.querySelector('.close-dialog').onclick=()=>dialog.close();dialog.querySelector('.begin').onclick=()=>{dialog.close();if(mode==='home')enter();};if(!dialog.open)dialog.showModal();
}
function chooseTower(type){buildType=type;view?.setBuildType(type);ui?.setBuildType(type);if(type)engine.selectTower(null);}
function notify(result){if(result?.message)ui?.notify(result.message);return result;}
function ripple(e){const pulse=document.createElement('div');pulse.className='entry-ripple';pulse.style.left=(e?.clientX||innerWidth*.18)+'px';pulse.style.top=(e?.clientY||innerHeight*.6)+'px';document.body.append(pulse);setTimeout(()=>pulse.remove(),1900);world?.burstAt(e?.clientX||innerWidth*.18,e?.clientY||innerHeight*.6);}
function enter(e){e?.preventDefault();if(!view){showError('The living world is still growing. Try Enter again in a moment.');return;}if(destination===1)return;ripple(e);destination=1;mode='entering';document.body.classList.add('journey','in-world');$('.stage').inert=true;$('.dock-wrap').inert=true;view.group.visible=true;engine.paused=true;}
function home(){if(destination===0)return;wasPaused=engine.paused;engine.paused=true;destination=0;mode='leaving';ui.setVisible(false);chooseTower(null);view.setActive(false);view.group.visible=true;}
function restart(){engine.restart();wasPaused=false;chooseTower(null);ui.notify('A new grove awaits.');}
function showError(message){let el=$('.world-error');if(!el){el=document.createElement('div');el.className='world-error';document.body.append(el);}el.textContent=message;setTimeout(()=>el.remove(),6000);}
function init(){if(world||!window.sylvaWorld)return;if(!engine.connected){if(!engine._waitingForJava){engine._waitingForJava=true;engine.ready.then(()=>{engine._waitingForJava=false;if(engine.connected)init();else showError('The Java grove service is not running. Start the project with npm run dev, then reload.');});}return;}world=window.sylvaWorld;
 try{
 view=createGameScene(world,engine,{onCell(col,row){if(mode!=='game')return;if(buildType){const result=notify(engine.place(buildType,col,row));if(result.ok)chooseTower(null);}else{const tower=engine.towers.find(t=>t.col===col&&t.row===row);engine.selectTower(tower?.id??null);}},onSelectTower(id){chooseTower(null);engine.selectTower(id);},effect:e=>audio.effect(e)});
 view.resize?.();view.group.visible=false;view.setActive(false);
 ui=createGameUI(engine,{home,chooseTower,restart,onRestart:()=>{wasPaused=false;chooseTower(null);},resetCamera:()=>view.resetCamera(),zoom:d=>view.zoom(d*120),showHelp:()=>showHelp(),save:()=>notify(engine.save()),load:()=>{const r=notify(engine.load());if(r.ok)chooseTower(null);return r;},sound:()=>audio.toggle()});
 ui.setVisible(false);
 window.sylva={engine,view,ui,world,enter,home,chooseTower,get mode(){return mode;}};
 window.sylvaFrame=frame;
 }catch(error){console.error('SYLVA initialization:',error);showError('The grove could not initialize. Please reload the page.');}
}
const homePosition={x:0,y:0,z:1400};
function frame(dt,time){
 if(document.hidden)return;
 qualityClock+=dt;qualityFrames++;
 if(qualityClock>4&&mode==='game'){const fps=qualityFrames/qualityClock;slowWindows=fps<32?slowWindows+1:0;if(slowWindows>=2&&world.renderer.getPixelRatio()>1){world.renderer.setPixelRatio(Math.max(1,world.renderer.getPixelRatio()-.25));world.renderer.setSize(world.renderer.domElement.clientWidth,world.renderer.domElement.clientHeight,false);slowWindows=0;}qualityClock=0;qualityFrames=0;}
 if(progress!==destination){const duration=reduced?.18:(destination?2.35:1.85);progress=Math.max(0,Math.min(1,progress+(destination?1:-1)*dt/duration));const p=progress*progress*progress*(progress*(progress*6-15)+10);
  document.body.style.setProperty('--world-progress',p.toFixed(4));
  if(progress===1){mode='game';engine.paused=wasPaused;view.setActive(true);ui.setVisible(true);$('.stage').style.visibility='hidden';$('.dock-wrap').style.visibility='hidden';}
  if(progress===0){mode='home';view.group.visible=false;document.body.classList.remove('journey','in-world');$('.stage').inert=false;$('.dock-wrap').inert=false;world.layout();}
 }
 if(progress>0){
  const p=progress*progress*progress*(progress*(progress*6-15)+10);
  if(destination===0){$('.stage').style.visibility='';$('.dock-wrap').style.visibility='';if(progress<.5)document.body.classList.remove('journey');}
  if(mode==='game')engine.update(dt);
  view.update(dt,time);
  const target=view.cameraTarget,position=view.cameraPosition;
  world.camera.position.set(homePosition.x+(position.x-homePosition.x)*p,homePosition.y+(position.y-homePosition.y)*p,homePosition.z+(position.z-homePosition.z)*p);
  world.camera.lookAt(target.x*p,target.y*p,target.z*p);
  const hf=2*Math.atan(world.renderer.domElement.clientHeight/2/1400)*180/Math.PI;
  world.camera.fov=hf+(40-hf)*p;world.camera.updateProjectionMatrix();
 }else{world.camera.position.z=1400;}
 const visible=progress<.995;world.nearGroup.visible=visible;world.farGroup.visible=visible;world.shadowMesh.visible=visible;world.glowMesh.visible=visible;
 // Authored pollen stays alive through the camera journey; the battlefield adds its own local drift.
 world.motes.visible=true;
 lastUI+=dt;if(lastUI>.10){ui.update(lastUI);lastUI=0;}
}
$('.liquid-button--play').addEventListener('click',enter,{signal});$('.dock-item--enter').addEventListener('click',enter,{signal});
for (const item of document.querySelectorAll('.dock-item')) item.setAttribute('aria-label', item.classList.contains('dock-item--enter') ? 'Enter the grove' : item.textContent.trim());
$('.liquid-button--explore').addEventListener('click',()=>showHelp(),{signal});
for(const el of document.querySelectorAll('.knob,.scroll'))el.addEventListener('click',e=>{e.preventDefault();showHelp(el.closest('.card--stove')!==null);},{signal});
for(const el of document.querySelectorAll('.dock-item:not(.dock-item--enter)'))el.addEventListener('click',e=>{e.preventDefault();const text=el.textContent.trim();if(text==='Habitats')showHelp();if(text==='Journal')showHelp(true);},{signal});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='game'){engine.paused=true;wasPaused=true;}},{signal});
$('#scene').addEventListener('webglcontextlost',e=>{e.preventDefault();engine.paused=true;showError('Graphics context paused. The grove will recover when your device is ready.');},{signal});
$('#scene').addEventListener('webglcontextrestored',()=>{ui?.notify('Graphics restored. Resume when ready.');},{signal});
window.addEventListener('resize',()=>view?.resize?.(),{signal});
window.addEventListener('sylva-ready',()=>queueMicrotask(init),{signal});if(window.sylvaWorld)init();
window.addEventListener('sylva-backend-message',event=>showError(event.detail),{signal});
window.addEventListener('pagehide',event=>{engine.save();if(event.persisted){engine.paused=true;return;}audio.dispose();ui?.dispose();view?.dispose();window.sylvaFrame=null;abort.abort();},{once:true});
