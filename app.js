// @ts-nocheck

const U=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"], L=[..."abcdefghijklmnopqrstuvwxyz"], D=[..."0123456789"], ALL=[...U,...L,...D];
const $=id=>document.getElementById(id);
const canvases=new Map();

const mediaSection=$("mediaSection"), lockedMessage=$("lockedMessage"), chooseMediaButton=$("chooseMediaButton");
const mediaInput=$("mediaInput"), packSelect=$("packSelect"), savedPacks=$("savedPacks");
const editorWrap=$("editorWrap"), imageEditor=$("imageEditor"), videoEditor=$("videoEditor");
const editorCanvas=$("editorCanvas"), ectx=editorCanvas.getContext("2d");
const videoPreview=$("videoPreview"), videoOverlay=$("videoOverlay"), voctx=videoOverlay.getContext("2d");
let selectedPackId=localStorage.getItem("handcaption_selected_pack")||"";
let baseImage=null,currentVideoURL=null,currentMediaType=null,textLayer=null,dragging=false,dragOffset={x:0,y:0};
const glyphCache=new Map();

function addChar(ch,parent){
  const card=document.createElement("div"),title=document.createElement("div"),canvas=document.createElement("canvas");
  card.className="char-card";title.className="char-title";title.textContent=ch;
  canvas.className="char-canvas";canvas.width=180;canvas.height=90;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=4;ctx.strokeStyle="#111";
  let drawing=false;
  const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
  canvas.onpointerdown=e=>{e.preventDefault();drawing=true;try{canvas.setPointerCapture(e.pointerId)}catch(_){}const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};
  canvas.onpointermove=e=>{if(!drawing)return;e.preventDefault();const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke()};
  const stop=e=>{drawing=false;try{canvas.releasePointerCapture(e.pointerId)}catch(_){}updateChar(ch);updateProgress()};
  canvas.onpointerup=stop;canvas.onpointercancel=stop;
  const actions=document.createElement("div"),erase=document.createElement("button"),status=document.createElement("div");
  actions.className="char-actions";erase.className="ghost";erase.textContent="Erase & rewrite";status.className="completed-label";
  erase.onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);updateChar(ch);updateProgress();canvas.scrollIntoView({behavior:"smooth",block:"center"})};
  actions.appendChild(erase);card.append(title,canvas,actions,status);parent.appendChild(card);canvases.set(ch,{canvas,card,status});
}
U.forEach(c=>addChar(c,$("uppercaseGrid")));L.forEach(c=>addChar(c,$("lowercaseGrid")));D.forEach(c=>addChar(c,$("digitsGrid")));

function blank(c){const d=c.getContext("2d",{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4)if(d[i]>0)return false;return true}
function updateChar(ch){const i=canvases.get(ch),done=!blank(i.canvas);i.card.classList.toggle("completed",done);i.status.textContent=done?"✓ Written":""}
function count(){let n=0;canvases.forEach(i=>{if(!blank(i.canvas))n++});return n}
function updateProgress(){
  const n=count(),p=Math.round(n/62*100);$("progressText").textContent=`${n} / 62 completed`;$("progressBar").style.width=p+"%";
  if(n===62){$("progressMessage").textContent="✓ All characters completed. You can save your handwriting.";savePack.disabled=false}
  else{$("progressMessage").textContent=`${62-n} character${62-n===1?"":"s"} remaining.`;savePack.disabled=true}
}
function packs(){try{return JSON.parse(localStorage.getItem("handcaption_packs")||"[]")}catch(_){return[]}}
function writePacks(p){try{localStorage.setItem("handcaption_packs",JSON.stringify(p));return true}catch(_){alert("Browser storage is full. Remove an old handwriting pack.");return false}}
function selectedPack(){return packs().find(p=>p.id===selectedPackId)||null}

function renderPacks(){
  const ps=packs();savedPacks.innerHTML="";packSelect.innerHTML="";
  if(!ps.length){packSelect.innerHTML='<option value="">No saved pack</option>';savedPacks.innerHTML='<div class="hint">No handwriting pack saved yet.</div>';lockMedia();return}
  ps.forEach((p,i)=>{
    if(!p.id){p.id="pack_"+(p.created||Date.now())+"_"+i}
    const opt=document.createElement("option");opt.value=p.id;opt.textContent=p.name;packSelect.appendChild(opt);
    const item=document.createElement("div");item.className="pack-item"+(p.id===selectedPackId?" selected":"");item.textContent="✍️ "+p.name;
    const small=document.createElement("small");small.textContent="62 characters";item.appendChild(small);
    item.onclick=()=>selectPack(p.id);
    savedPacks.appendChild(item);
  });
  // Persist IDs for old V2 packs.
  writePacks(ps);
  if(!selectedPackId||!ps.some(p=>p.id===selectedPackId))selectedPackId=ps[0].id;
  packSelect.value=selectedPackId;localStorage.setItem("handcaption_selected_pack",selectedPackId);
  $("selectedPackName") && ($("selectedPackName").textContent=selectedPack().name);
  unlockMedia();
}
function selectPack(id){
  const p=packs().find(x=>x.id===id);if(!p)return;
  selectedPackId=id;localStorage.setItem("handcaption_selected_pack",id);packSelect.value=id;renderPacks();
  if(currentMediaType==="image")drawImageCaption();if(currentMediaType==="video")drawVideoOverlay();
}
packSelect.onchange=()=>selectPack(packSelect.value);

function unlockMedia(){mediaSection.classList.remove("locked");lockedMessage.classList.add("hidden");packSelect.disabled=false;chooseMediaButton.disabled=!selectedPackId}
function lockMedia(){mediaSection.classList.add("locked");lockedMessage.classList.remove("hidden");packSelect.disabled=true;chooseMediaButton.disabled=true}
$("savePack").onclick=()=>{
  if(count()!==62){alert("Write all 62 characters first.");return}
  const glyphs={};canvases.forEach((i,ch)=>glyphs[ch]=i.canvas.toDataURL("image/png"));
  const name=$("packName").value.trim()||"My Handwriting";const ps=packs();
  let p=ps.find(x=>x.name.toLowerCase()===name.toLowerCase());
  if(!p){p={id:"pack_"+Date.now()+"_"+Math.random().toString(36).slice(2),created:Date.now()};ps.push(p)}
  p.name=name;p.glyphs=glyphs;p.characterCount=62;p.updated=Date.now();
  if(writePacks(ps)){selectedPackId=p.id;localStorage.setItem("handcaption_selected_pack",p.id);renderPacks();alert("✓ Handwriting saved and selected.")}
};
$("clearPack").onclick=()=>{if(!confirm("Erase all 62 characters and start again?"))return;canvases.forEach(i=>i.canvas.getContext("2d").clearRect(0,0,i.canvas.width,i.canvas.height));updateProgress();lockMedia()};

chooseMediaButton.onclick=()=>{if(!selectedPackId){alert("Select or save a handwriting pack first.");return}mediaInput.click()};

mediaInput.onchange=e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(currentVideoURL){URL.revokeObjectURL(currentVideoURL);currentVideoURL=null}
  textLayer=null;editorWrap.classList.remove("hidden");
  if(f.type.startsWith("image/")){
    currentMediaType="image";$("mediaType").textContent="PHOTO";imageEditor.classList.remove("hidden");videoEditor.classList.add("hidden");
    const img=new Image();img.onload=()=>{baseImage=img;fitImage()};img.onerror=()=>alert("Could not open this image.");img.src=URL.createObjectURL(f);
  }else if(f.type.startsWith("video/")){
    currentMediaType="video";$("mediaType").textContent="VIDEO";imageEditor.classList.add("hidden");videoEditor.classList.remove("hidden");
    currentVideoURL=URL.createObjectURL(f);videoPreview.src=currentVideoURL;videoPreview.load();
    videoPreview.onloadedmetadata=()=>{videoOverlay.width=videoPreview.videoWidth;videoOverlay.height=videoPreview.videoHeight};
  }else alert("Choose a photo or video.");
  mediaInput.value="";
};
function fitImage(){const s=Math.min(1000/baseImage.width,700/baseImage.height,1);editorCanvas.width=Math.round(baseImage.width*s);editorCanvas.height=Math.round(baseImage.height*s);drawImageCaption()}
function glyph(src){if(glyphCache.has(src))return Promise.resolve(glyphCache.get(src));return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{glyphCache.set(src,im);res(im)};im.onerror=rej;im.src=src})}
async function drawImageCaption(){
  if(!baseImage)return;ectx.clearRect(0,0,editorCanvas.width,editorCanvas.height);ectx.drawImage(baseImage,0,0,editorCanvas.width,editorCanvas.height);
  if(!textLayer)return;const p=selectedPack();if(!p)return;const size=+$("sizeInput").value;let x=textLayer.x,y=textLayer.y;
  for(const ch of textLayer.text){if(p.glyphs[ch]){try{const im=await glyph(p.glyphs[ch]),s=size/90,w=180*s,h=90*s;ectx.drawImage(im,x,y-h*.75,w,h);x+=w*.72}catch(_){}}else{ectx.fillStyle=textLayer.color;ectx.font=`${size}px cursive`;ectx.fillText(ch,x,y);x+=ectx.measureText(ch).width+size*.08}}
}
$("addCaption").onclick=()=>{
  const text=$("captionInput").value;if(!selectedPackId){alert("Select a handwriting pack.");return}if(!text.trim()){alert("Type a caption.");return}
  textLayer={text,x:30,y:currentMediaType==="image"?editorCanvas.height*.82:videoOverlay.height*.82,color:$("colorInput").value};
  if(currentMediaType==="image")drawImageCaption();else drawVideoOverlay();
};
function point(c,e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}}
editorCanvas.onpointerdown=e=>{if(!textLayer)return;const p=point(editorCanvas,e),s=+$("sizeInput").value;if(p.y>textLayer.y-s*1.2&&p.y<textLayer.y+40){dragging=true;dragOffset={x:p.x-textLayer.x,y:p.y-textLayer.y};try{editorCanvas.setPointerCapture(e.pointerId)}catch(_){}}};
editorCanvas.onpointermove=e=>{if(!dragging)return;const p=point(editorCanvas,e);textLayer.x=p.x-dragOffset.x;textLayer.y=p.y-dragOffset.y;drawImageCaption()};
editorCanvas.onpointerup=()=>dragging=false;editorCanvas.onpointercancel=()=>dragging=false;
$("sizeInput").oninput=()=>currentMediaType==="image"?drawImageCaption():drawVideoOverlay();
$("colorInput").oninput=()=>{if(textLayer)textLayer.color=$("colorInput").value;currentMediaType==="image"?drawImageCaption():drawVideoOverlay()};
$("captionInput").oninput=()=>{if(textLayer){textLayer.text=$("captionInput").value;currentMediaType==="image"?drawImageCaption():drawVideoOverlay()}};

async function drawVideoOverlay(){
  if(!videoOverlay.width||!textLayer)return;voctx.clearRect(0,0,videoOverlay.width,videoOverlay.height);const p=selectedPack();if(!p)return;
  const size=+$("sizeInput").value*(videoOverlay.width/1000);let x=textLayer.x,y=textLayer.y;
  for(const ch of textLayer.text){if(p.glyphs[ch]){try{const im=await glyph(p.glyphs[ch]),s=size/90,w=180*s,h=90*s;voctx.drawImage(im,x,y-h*.75,w,h);x+=w*.72}catch(_){}}else{voctx.fillStyle=textLayer.color;voctx.font=`${size}px cursive`;voctx.fillText(ch,x,y);x+=voctx.measureText(ch).width+size*.08}}
}
videoPreview.onplay=()=>drawVideoOverlay();
videoPreview.ontimeupdate=()=>drawVideoOverlay();
$("exportBtn").onclick=async()=>{if(currentMediaType!=="image"){alert("Video export is the next step. The video and handwriting overlay are working locally.");return}await drawImageCaption();const a=document.createElement("a");a.download="handcaption.png";a.href=editorCanvas.toDataURL("image/png",1);a.click()};

// IMPORTANT: Existing saved packs are usable immediately after page reload.
// We do not require rewriting all 62 characters if a complete pack already exists.
function startup(){
  const ps=packs();
  if(ps.length){
    selectedPackId=localStorage.getItem("handcaption_selected_pack")||ps[0].id;
    renderPacks();
  }else{
    lockMedia();
  }
  updateProgress();
}
startup();
  
