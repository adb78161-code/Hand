// @ts-nocheck
// HandCaption V9
// Browser-only / local processing. No media is uploaded to a server.
"use strict";

const U=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const L=[..."abcdefghijklmnopqrstuvwxyz"];
const D=[..."0123456789"];
const ALL=[...U,...L,...D];

const HC_SECURITY=Object.freeze({
  MAX_PACKS:20,
  MAX_PACK_NAME:30,
  MAX_CAPTION:200,
  MAX_IMAGE_BYTES:15*1024*1024,
  MAX_VIDEO_BYTES:100*1024*1024,
  IMAGE_TYPES:Object.freeze(["image/jpeg","image/png","image/webp"]),
  VIDEO_TYPES:Object.freeze(["video/mp4","video/webm","video/quicktime"])
});

const $=id=>document.getElementById(id);

let selectedPackId=localStorage.getItem("handcaption_selected_pack")||"";
let currentEditingPackId=null;
let currentMediaType=null;
let baseImage=null;
let currentVideoURL=null;
let currentImageURL=null;
let dragging=false;
let dragOffset={x:0,y:0};

const glyphs=Object.create(null);
const writingHistory=new Map();
let currentCharIndex=0;
let writing=false;

let captions=[];
let activeCaptionId=null;
let historyStates=[];
let historyIndex=-1;

const writingCanvas=$("writingCanvas");
const wctx=writingCanvas.getContext("2d",{willReadFrequently:true});

function safeArray(raw){
  try{const v=JSON.parse(raw||"[]");return Array.isArray(v)?v:[]}
  catch(_){return[]}
}

function normalizePack(p,index){
  if(!p||typeof p!=="object"||!p.glyphs||typeof p.glyphs!=="object")return null;
  const id=String(p.id||("pack_"+(p.created||Date.now())+"_"+index)).slice(0,100);
  const name=String(p.name||"My Handwriting").replace(/[<>]/g,"").trim().slice(0,HC_SECURITY.MAX_PACK_NAME)||"My Handwriting";
  const clean={};
  for(const ch of ALL){
    const v=p.glyphs[ch];
    if(typeof v==="string"&&v.startsWith("data:image/png;base64,"))clean[ch]=v;
  }
  if(Object.keys(clean).length!==62)return null;
  return{id,name,characterCount:62,created:Number(p.created)||Date.now(),updated:Number(p.updated)||Date.now(),glyphs:clean};
}

function packs(){
  const keys=[
    "handcaption_packs_v9",
    "handcaption_packs_v8",
    "handcaption_packs_v7",
    "handcaption_packs_v6",
    "handcaption_packs_v5",
    "handcaption_packs"
  ];
  for(const key of keys){
    const raw=localStorage.getItem(key);
    if(!raw)continue;
    const list=safeArray(raw).map(normalizePack).filter(Boolean).slice(0,HC_SECURITY.MAX_PACKS);
    if(list.length){
      try{localStorage.setItem("handcaption_packs_v9",JSON.stringify(list))}catch(_){}
      return list;
    }
  }
  return [];
}

function savePacks(list){
  const safe=list.map(normalizePack).filter(Boolean).slice(0,HC_SECURITY.MAX_PACKS);
  try{
    localStorage.setItem("handcaption_packs_v9",JSON.stringify(safe));
    return true;
  }catch(_){
    alert("Storage is full. Delete an old handwriting pack.");
    return false;
  }
}

function selectedPack(){
  return packs().find(p=>p.id===selectedPackId)||null;
}

/* ---------- Guided handwriting ---------- */

function currentChar(){return ALL[currentCharIndex]}

function blankCanvas(){
  const d=wctx.getImageData(0,0,writingCanvas.width,writingCanvas.height).data;
  for(let i=3;i<d.length;i+=4)if(d[i]>0)return false;
  return true;
}

function captureGlyph(){
  glyphs[currentChar()]=blankCanvas()?null:writingCanvas.toDataURL("image/png");
}

function setGlyphCanvas(src){
  wctx.clearRect(0,0,writingCanvas.width,writingCanvas.height);
  if(!src){updateWritingUI();return}
  const im=new Image();
  im.onload=()=>{
    wctx.drawImage(im,0,0,writingCanvas.width,writingCanvas.height);
    updateWritingUI();
  };
  im.src=src;
}

function pushWritingHistory(ch){
  const src=blankCanvas()?"":writingCanvas.toDataURL("image/png");
  let h=writingHistory.get(ch);
  if(!h){h={states:[""],index:0};writingHistory.set(ch,h)}
  if(h.states[h.index]===src)return;
  h.states=h.states.slice(0,h.index+1);
  h.states.push(src);
  h.index=h.states.length-1;
}

function updateWritingUI(){
  const ch=currentChar();
  const written=!!glyphs[ch];
  const completed=ALL.filter(c=>!!glyphs[c]).length;

  $("currentChar").textContent=ch;
  $("guideChar").textContent=ch;
  $("charProgress").textContent=`${currentCharIndex+1} / 62`;
  $("charStatus").textContent=written?"✓ Written":"Not written";
  $("charStatus").style.color=written?"#14733e":"#777";
  $("writingProgressBar").style.width=`${completed/62*100}%`;
  $("backChar").disabled=currentCharIndex===0;
  $("nextChar").disabled=!written;
  $("nextChar").textContent=currentCharIndex===61?"Finish ✓":"Next →";

  const list=$("characterChecklist");
  list.replaceChildren();
  ALL.forEach((c,i)=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="character-check"+(glyphs[c]?" done":"")+(i===currentCharIndex?" current":"");
    b.textContent=c;
    b.title=`Character ${i+1} of 62`;
    b.onclick=()=>goToCharacter(i);
    list.append(b);
  });

  $("progressText").textContent=`${completed} / 62 completed`;
  $("progressMessage").textContent=completed===62
    ?"✓ All characters completed. You can save this pack."
    :`${62-completed} character${62-completed===1?"":"s"} remaining.`;
  $("progressBar").style.width=`${completed/62*100}%`;
  $("savePack").disabled=completed!==62;
}

function goToCharacter(index){
  if(index<0||index>=62)return;
  captureGlyph();
  currentCharIndex=index;
  setGlyphCanvas(glyphs[currentChar()]||"");
  updateWritingUI();
}

function clearCurrentCharacter(){
  wctx.clearRect(0,0,writingCanvas.width,writingCanvas.height);
  glyphs[currentChar()]=null;
  pushWritingHistory(currentChar());
  updateWritingUI();
}

function resetNewPack(name="My Handwriting"){
  for(const c of ALL)delete glyphs[c];
  writingHistory.clear();
  currentCharIndex=0;
  currentEditingPackId=null;
  $("packName").value=name;
  wctx.clearRect(0,0,writingCanvas.width,writingCanvas.height);
  updateWritingUI();
  lockMedia();
}

function startWriting(e){
  e.preventDefault();
  writing=true;
  try{writingCanvas.setPointerCapture(e.pointerId)}catch(_){}
  const r=writingCanvas.getBoundingClientRect();
  wctx.beginPath();
  wctx.moveTo(
    (e.clientX-r.left)*writingCanvas.width/r.width,
    (e.clientY-r.top)*writingCanvas.height/r.height
  );
}

function moveWriting(e){
  if(!writing)return;
  e.preventDefault();
  const r=writingCanvas.getBoundingClientRect();
  const x=(e.clientX-r.left)*writingCanvas.width/r.width;
  const y=(e.clientY-r.top)*writingCanvas.height/r.height;
  wctx.lineCap="round";
  wctx.lineJoin="round";
  wctx.lineWidth=8;
  wctx.strokeStyle="#111";
  wctx.lineTo(x,y);
  wctx.stroke();
  $("charStatus").textContent="Writing…";
}

function stopWriting(){
  if(!writing)return;
  writing=false;
  captureGlyph();
  pushWritingHistory(currentChar());
  updateWritingUI();
}

writingCanvas.addEventListener("pointerdown",startWriting);
writingCanvas.addEventListener("pointermove",moveWriting);
writingCanvas.addEventListener("pointerup",stopWriting);
writingCanvas.addEventListener("pointercancel",stopWriting);

$("redrawChar").onclick=clearCurrentCharacter;
$("backChar").onclick=()=>{captureGlyph();goToCharacter(currentCharIndex-1)};
$("nextChar").onclick=()=>{
  captureGlyph();
  if(!glyphs[currentChar()]){
    alert("Write this character before continuing.");
    return;
  }
  if(currentCharIndex<61)goToCharacter(currentCharIndex+1);
  else updateWritingUI();
};

$("characterChecklist").addEventListener("click",()=>{});

$("savePack").onclick=()=>{
  captureGlyph();
  const completed=ALL.filter(c=>!!glyphs[c]).length;
  if(completed!==62){
    alert("Complete all 62 characters first.");
    return;
  }

  const ps=packs();
  const name=$("packName").value.replace(/[<>]/g,"").trim().slice(0,HC_SECURITY.MAX_PACK_NAME)||"My Handwriting";
  let p=currentEditingPackId?ps.find(x=>x.id===currentEditingPackId):null;

  if(!p){
    if(ps.length>=HC_SECURITY.MAX_PACKS){
      alert("You can keep up to 20 handwriting packs.");
      return;
    }
    p={id:"pack_"+Date.now()+"_"+Math.random().toString(36).slice(2),created:Date.now()};
    ps.push(p);
  }

  p.name=name;
  p.characterCount=62;
  p.updated=Date.now();
  p.glyphs={};
  for(const c of ALL)p.glyphs[c]=glyphs[c];

  if(savePacks(ps)){
    currentEditingPackId=p.id;
    selectedPackId=p.id;
    localStorage.setItem("handcaption_selected_pack",p.id);
    renderPacks();
    unlockMedia();
    alert("✓ Handwriting pack saved.");
  }
};

$("clearPack").onclick=()=>{
  if(confirm("Erase all 62 characters?"))resetNewPack("My Handwriting");
};

$("newPack").onclick=()=>{
  resetNewPack("New Handwriting");
  window.scrollTo({top:0,behavior:"smooth"});
};

function loadPack(id){
  const p=packs().find(x=>x.id===id);
  if(!p)return;

  currentEditingPackId=id;
  $("packName").value=p.name;
  writingHistory.clear();

  for(const c of ALL)glyphs[c]=p.glyphs[c];
  currentCharIndex=0;
  setGlyphCanvas(glyphs[currentChar()]||"");
  updateWritingUI();

  window.scrollTo({top:0,behavior:"smooth"});
}

function deletePack(id){
  const p=packs().find(x=>x.id===id);
  if(!p||!confirm(`Delete "${p.name}"?`))return;

  const next=packs().filter(x=>x.id!==id);
  savePacks(next);

  if(selectedPackId===id)selectedPackId=next[0]?.id||"";
  if(currentEditingPackId===id)currentEditingPackId=null;

  localStorage.setItem("handcaption_selected_pack",selectedPackId);
  renderPacks();
}

$("deletePack").onclick=()=>{if(selectedPackId)deletePack(selectedPackId)};

function renderPacks(){
  const ps=packs();
  $("savedPacks").replaceChildren();
  $("packSelect").replaceChildren();

  if(!ps.length){
    const o=document.createElement("option");
    o.value="";
    o.textContent="No pack selected";
    $("packSelect").append(o);
    $("deletePack").disabled=true;
    lockMedia();
    return;
  }

  ps.forEach(p=>{
    const o=document.createElement("option");
    o.value=p.id;
    o.textContent=p.name;
    $("packSelect").append(o);

    const item=document.createElement("div");
    item.className="pack-item"+(p.id===selectedPackId?" selected":"");

    const name=document.createElement("strong");
    name.textContent="✍️ "+p.name;

    const small=document.createElement("small");
    small.textContent="62 characters";

    const buttons=document.createElement("div");
    buttons.className="pack-buttons";

    const use=document.createElement("button");
    use.className="primary";
    use.textContent="Use";
    use.onclick=()=>selectPack(p.id);

    const edit=document.createElement("button");
    edit.className="ghost";
    edit.textContent="Edit";
    edit.onclick=()=>loadPack(p.id);

    const del=document.createElement("button");
    del.className="danger";
    del.textContent="Delete";
    del.onclick=()=>deletePack(p.id);

    buttons.append(use,edit,del);
    item.append(name,small,buttons);
    $("savedPacks").append(item);
  });

  if(!selectedPackId||!ps.some(p=>p.id===selectedPackId)){
    selectedPackId=ps[0].id;
  }

  localStorage.setItem("handcaption_selected_pack",selectedPackId);
  $("packSelect").value=selectedPackId;
  $("deletePack").disabled=false;
  unlockMedia();
}

function selectPack(id){
  if(!packs().some(p=>p.id===id))return;
  selectedPackId=id;
  localStorage.setItem("handcaption_selected_pack",id);
  $("packSelect").value=id;
  renderPacks();
  renderCurrentMedia();
}

$("packSelect").onchange=()=>selectPack($("packSelect").value);

function lockMedia(){
  $("mediaSection").classList.add("locked");
  $("lockedMessage").classList.remove("hidden");
  $("packSelect").disabled=true;
  $("chooseMediaButton").disabled=true;
}

function unlockMedia(){
  $("mediaSection").classList.remove("locked");
  $("lockedMessage").classList.add("hidden");
  $("packSelect").disabled=false;
  $("chooseMediaButton").disabled=!selectedPackId;
}

/* ---------- Media ---------- */

function validFile(f){
  if(!f)return{ok:false,msg:"No file selected."};
  if(HC_SECURITY.IMAGE_TYPES.includes(f.type)&&f.size<=HC_SECURITY.MAX_IMAGE_BYTES)return{ok:true,type:"image"};
  if(HC_SECURITY.VIDEO_TYPES.includes(f.type)&&f.size<=HC_SECURITY.MAX_VIDEO_BYTES)return{ok:true,type:"video"};
  return{ok:false,msg:"Unsupported or oversized file. Images: JPEG/PNG/WebP up to 15 MB. Videos: MP4/WebM/MOV up to 100 MB."};
}

function releaseMediaURLs(){
  if(currentVideoURL){URL.revokeObjectURL(currentVideoURL);currentVideoURL=null}
  if(currentImageURL){URL.revokeObjectURL(currentImageURL);currentImageURL=null}
}

function clearEditor(){
  captions=[];
  activeCaptionId=null;
  historyStates=[];
  historyIndex=-1;
  $("captionLayers").replaceChildren();
  $("captionInput").value="";
}

function addMedia(){
  if(selectedPackId)$("mediaInput").click();
}

$("chooseMediaButton").onclick=addMedia;
$("addMediaButton").onclick=addMedia;

$("mediaInput").onchange=e=>{
  const f=e.target.files?.[0];
  if(!f)return;

  const v=validFile(f);
  if(!v.ok){
    alert(v.msg);
    e.target.value="";
    return;
  }

  releaseMediaURLs();
  clearEditor();

  $("editorWrap").classList.remove("hidden");

  if(v.type==="image"){
    currentMediaType="image";
    $("mediaType").textContent="PHOTO";
    $("imageEditor").classList.remove("hidden");
    $("videoEditor").classList.add("hidden");

    currentImageURL=URL.createObjectURL(f);
    const im=new Image();

    im.onload=()=>{
      baseImage=im;
      fitImage();
    };

    im.onerror=()=>{
      releaseMediaURLs();
      alert("Could not open this image.");
    };

    im.src=currentImageURL;
  }else{
    currentMediaType="video";
    $("mediaType").textContent="VIDEO";
    $("imageEditor").classList.add("hidden");
    $("videoEditor").classList.remove("hidden");

    currentVideoURL=URL.createObjectURL(f);
    const video=$("videoPreview");
    video.src=currentVideoURL;
    video.load();

    video.onloadedmetadata=()=>{
      $("videoOverlay").width=video.videoWidth||1280;
      $("videoOverlay").height=video.videoHeight||720;
      drawVideo();
    };
  }

  e.target.value="";
};

$("removeMedia").onclick=()=>{
  releaseMediaURLs();
  baseImage=null;
  currentMediaType=null;
  clearEditor();
  $("videoPreview").pause();
  $("videoPreview").removeAttribute("src");
  $("videoPreview").load();
  $("editorWrap").classList.add("hidden");
};

function fitImage(){
  if(!baseImage)return;
  const s=Math.min(1000/baseImage.width,700/baseImage.height,1);
  $("editorCanvas").width=Math.round(baseImage.width*s);
  $("editorCanvas").height=Math.round(baseImage.height*s);
  drawImage();
}

/* ---------- Caption layers ---------- */

function cloneCaptions(){
  return JSON.parse(JSON.stringify(captions));
}

function saveEditorHistory(){
  const state=JSON.stringify({captions,activeCaptionId});
  if(historyStates[historyIndex]===state)return;
  historyStates=historyStates.slice(0,historyIndex+1);
  historyStates.push(state);
  historyIndex=historyStates.length-1;
  if(historyStates.length>30){
    historyStates.shift();
    historyIndex--;
  }
}

function restoreEditorHistory(i){
  if(i<0||i>=historyStates.length)return;
  const s=JSON.parse(historyStates[i]);
  captions=s.captions||[];
  activeCaptionId=s.activeCaptionId||null;
  historyIndex=i;
  renderLayerUI();
  syncControls();
  renderCurrentMedia();
}

function createCaption(){
  if(captions.length>=10){
    alert("Maximum 10 caption layers.");
    return null;
  }

  return{
    id:"cap_"+Date.now()+"_"+Math.random().toString(36).slice(2),
    text:$("captionInput").value.slice(0,HC_SECURITY.MAX_CAPTION),
    x:30,
    y:currentMediaType==="image"?$("editorCanvas").height*.82:$("videoOverlay").height*.82,
    size:+$("sizeInput").value,
    color:$("colorInput").value,
    rotation:+$("rotationInput").value,
    animation:$("animationInput").value,
    duration:+$("durationInput").value
  };
}

function activeCaption(){
  return captions.find(c=>c.id===activeCaptionId)||null;
}

function syncControls(){
  const c=activeCaption();
  if(!c)return;
  $("captionInput").value=c.text;
  $("sizeInput").value=c.size;
  $("colorInput").value=c.color;
  $("rotationInput").value=c.rotation;
  $("animationInput").value=c.animation;
  $("durationInput").value=c.duration;
}

function renderLayerUI(){
  const box=$("captionLayers");
  box.replaceChildren();

  captions.forEach((c,i)=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="layer-pill"+(c.id===activeCaptionId?" active":"");
    b.textContent=`${i+1}. ${c.text.slice(0,18)||"Caption"}`;
    b.onclick=()=>{
      activeCaptionId=c.id;
      syncControls();
      renderLayerUI();
      renderCurrentMedia();
    };
    box.append(b);
  });
}

$("addCaption").onclick=()=>{
  if(!selectedPackId){
    alert("Select a handwriting pack.");
    return;
  }

  const text=$("captionInput").value.trim().slice(0,HC_SECURITY.MAX_CAPTION);
  if(!text){
    alert("Type a caption.");
    return;
  }

  let c=activeCaption();

  if(c){
    c.text=text;
    c.size=+$("sizeInput").value;
    c.color=$("colorInput").value;
    c.rotation=+$("rotationInput").value;
    c.animation=$("animationInput").value;
    c.duration=+$("durationInput").value;
  }else{
    c=createCaption();
    if(!c)return;
    captions.push(c);
    activeCaptionId=c.id;
  }

  saveEditorHistory();
  renderLayerUI();
  renderCurrentMedia();
};

$("deleteCaption").onclick=()=>{
  if(!activeCaptionId)return;
  captions=captions.filter(c=>c.id!==activeCaptionId);
  activeCaptionId=captions[0]?.id||null;
  saveEditorHistory();
  renderLayerUI();
  syncControls();
  renderCurrentMedia();
};

["captionInput","sizeInput","colorInput","rotationInput","animationInput","durationInput"].forEach(id=>{
  $(id).addEventListener("input",()=>{
    const c=activeCaption();
    if(!c)return;

    if(id==="captionInput")c.text=$(id).value.slice(0,HC_SECURITY.MAX_CAPTION);
    if(id==="sizeInput")c.size=+$(id).value;
    if(id==="colorInput")c.color=$(id).value;
    if(id==="rotationInput")c.rotation=+$(id).value;
    if(id==="animationInput")c.animation=$(id).value;
    if(id==="durationInput")c.duration=+$(id).value;

    renderLayerUI();
    renderCurrentMedia();
  });
});

function animationProgress(c,time){
  const d=Math.max(.2,+c.duration||1.2);
  if(c.animation==="none")return 1;
  const t=Math.max(0,time||0);
  return Math.max(0,Math.min(1,t/d));
}

async function drawCaption(ctx,c,time=0,scale=1){
  const pack=selectedPack();
  if(!pack)return;

  let progress=animationProgress(c,time);
  let alpha=1;
  let offsetX=0;
  let scaleAnim=1;

  if(c.animation==="fade")alpha=progress;
  if(c.animation==="slide"){alpha=progress;offsetX=(1-progress)*80*scale}
  if(c.animation==="pop"){alpha=progress;scaleAnim=.75+.25*progress}

  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(c.x+offsetX,c.y);
  ctx.rotate((c.rotation*Math.PI)/180);
  ctx.scale(scaleAnim,scaleAnim);

  let x=0;
  const targetCount=c.animation==="write"?Math.ceil(c.text.length*progress):c.text.length;

  for(let i=0;i<targetCount;i++){
    const ch=c.text[i];
    const src=pack.glyphs?.[ch];

    if(src){
      try{
        const im=await loadGlyph(src);
        const k=(c.size*scale)/90;
        const w=180*k;
        const h=90*k;
        ctx.drawImage(im,x,-h*.75,w,h);
        x+=w*.72;
      }catch(_){}
    }else{
      ctx.fillStyle=c.color;
      ctx.font=`${c.size*scale}px cursive`;
      ctx.textBaseline="alphabetic";
      ctx.fillText(ch,x,0);
      x+=ctx.measureText(ch).width+c.size*.08;
    }
  }

  ctx.restore();
}

const glyphCache=new Map();

function loadGlyph(src){
  if(glyphCache.has(src))return Promise.resolve(glyphCache.get(src));
  return new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>{glyphCache.set(src,im);resolve(im)};
    im.onerror=reject;
    im.src=src;
  });
}

async function drawImage(time=0){
  if(!baseImage)return;

  const c=$("editorCanvas");
  const ctx=c.getContext("2d");

  ctx.clearRect(0,0,c.width,c.height);
  ctx.drawImage(baseImage,0,0,c.width,c.height);

  for(const cap of captions){
    await drawCaption(ctx,cap,time,1);
  }
}

async function drawVideo(){
  const c=$("videoOverlay");
  const video=$("videoPreview");
  if(!c.width||!selectedPackId)return;

  const ctx=c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);

  const scale=c.width/1000;

  for(const cap of captions){
    await drawCaption(ctx,cap,video.currentTime,scale);
  }
}

function renderCurrentMedia(){
  if(currentMediaType==="image")drawImage(0);
  if(currentMediaType==="video")drawVideo();
}

$("videoPreview").addEventListener("timeupdate",drawVideo);
$("videoPreview").addEventListener("play",()=>{
  const loop=()=>{
    if($("videoPreview").paused)return;
    drawVideo();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

/* ---------- Drag caption on photo ---------- */

function canvasPoint(c,e){
  const r=c.getBoundingClientRect();
  return{
    x:(e.clientX-r.left)*c.width/r.width,
    y:(e.clientY-r.top)*c.height/r.height
  };
}

$("editorCanvas").addEventListener("pointerdown",e=>{
  const c=activeCaption();
  if(!c)return;

  const p=canvasPoint($("editorCanvas"),e);
  if(Math.abs(p.x-c.x)<220&&Math.abs(p.y-c.y)<Math.max(100,c.size*1.4)){
    dragging=true;
    dragOffset={x:p.x-c.x,y:p.y-c.y};
    try{$("editorCanvas").setPointerCapture(e.pointerId)}catch(_){}
  }
});

$("editorCanvas").addEventListener("pointermove",e=>{
  if(!dragging)return;
  const c=activeCaption();
  if(!c)return;

  const p=canvasPoint($("editorCanvas"),e);
  c.x=p.x-dragOffset.x;
  c.y=p.y-dragOffset.y;
  drawImage();
});

$("editorCanvas").addEventListener("pointerup",()=>{
  if(dragging){
    dragging=false;
    saveEditorHistory();
  }
});
$("editorCanvas").addEventListener("pointercancel",()=>dragging=false);

/* ---------- Export ---------- */

$("exportBtn").onclick=async()=>{
  if(currentMediaType==="image"){
    await drawImage(999);
    const a=document.createElement("a");
    a.download="handcaption.png";
    a.rel="noopener";
    a.href=$("editorCanvas").toDataURL("image/png",1);
    document.body.append(a);
    a.click();
    a.remove();
    return;
  }

  if(currentMediaType==="video"){
    await exportVideo();
  }
};

async function exportVideo(){
  const video=$("videoPreview");

  if(!video.src){
    alert("Choose a video first.");
    return;
  }

  if(!window.MediaRecorder||!video.captureStream){
    alert("This Android browser does not support local video export. Photo export still works.");
    return;
  }

  const canvas=$("videoOverlay");
  const source=video.captureStream();
  const overlay=canvas.captureStream(30);
  const stream=new MediaStream([
    ...source.getVideoTracks(),
    ...overlay.getVideoTracks()
  ]);

  const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"]
    .find(t=>MediaRecorder.isTypeSupported(t));

  if(!mime){
    alert("No supported browser video export format was found.");
    return;
  }

  const chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:mime});

  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  recorder.onerror=()=>alert("Video export failed.");

  recorder.onstop=()=>{
    const blob=new Blob(chunks,{type:mime});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.download="handcaption-video.webm";
    a.href=url;
    a.rel="noopener";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  };

  const oldTime=video.currentTime;
  video.currentTime=0;

  recorder.start(250);
  await video.play().catch(()=>{});

  const finish=()=>{
    video.removeEventListener("ended",finish);
    recorder.stop();
    video.pause();
    video.currentTime=oldTime;
  };

  video.addEventListener("ended",finish);
}

function startup(){
  const ps=packs();

  if(ps.length){
    if(!selectedPackId||!ps.some(p=>p.id===selectedPackId)){
      selectedPackId=ps[0].id;
    }
    localStorage.setItem("handcaption_selected_pack",selectedPackId);
    renderPacks();
  }else{
    lockMedia();
  }

  updateWritingUI();
}

window.addEventListener("pagehide",()=>{
  if(currentVideoURL)URL.revokeObjectURL(currentVideoURL);
  if(currentImageURL)URL.revokeObjectURL(currentImageURL);
});

startup();
