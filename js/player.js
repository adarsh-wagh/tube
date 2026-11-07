(async () => {
  await (window.BUNNY_VIDEOS_READY || Promise.resolve());
  const $ = id => document.getElementById(id);
  const videos = window.BUNNY_VIDEOS || [];
  const placeholders = [1,2,3].map((n) => ({id:`coming-${n}`,title:"Coming soon...",description:"A new little video will bloom here soon.",thumbnail:"thumbnails/coming-soon.svg",duration:"Coming soon",category:"Coming soon",placeholder:true}));
  const store = window.BunnyStorage;
  const video = $("video");
  const videoFrame = $("videoFrame");
  const emptyOverlay = $("videoEmpty");

  // Show player controls on mouse/touch activity, then hide after 3 seconds
  // of inactivity while the video is playing. Keep controls visible when paused.
  let controlsHideTimer = null;
  function showPlayerControls() {
    videoFrame.classList.remove("controls-hidden");
    if (controlsHideTimer) window.clearTimeout(controlsHideTimer);
    if (!video.paused && !video.ended) {
      controlsHideTimer = window.setTimeout(() => {
        if (!video.paused && !video.ended) {
          videoFrame.classList.add("controls-hidden");
        }
      }, 3000);
    }
  }
  function keepControlsVisible() {
    videoFrame.classList.remove("controls-hidden");
    if (controlsHideTimer) {
      window.clearTimeout(controlsHideTimer);
      controlsHideTimer = null;
    }
  }
  ["mousemove", "pointermove", "pointerdown", "touchstart"].forEach(eventName => {
    videoFrame.addEventListener(eventName, showPlayerControls, { passive: true });
  });
  video.addEventListener("play", showPlayerControls);
  video.addEventListener("pause", keepControlsVisible);
  video.addEventListener("ended", keepControlsVisible);
  function syncEmptyOverlay() {
    const hasVideo = Boolean(video.currentSrc || video.getAttribute("src"));
    emptyOverlay.hidden = hasVideo;
  }
  video.addEventListener("loadedmetadata", syncEmptyOverlay);
  video.addEventListener("playing", () => { emptyOverlay.hidden = true; });
  video.addEventListener("error", () => {
    // Keep the welcome state hidden when a source exists but fails to load;
    // the browser's media error is more useful than covering the player.
    if (video.currentSrc || video.getAttribute("src")) emptyOverlay.hidden = true;
  });
  let currentId = null, shuffle = false, repeatMode = 0, miniActive = false, miniSyncing = false;
  let activeList = [...videos];
  emptyOverlay.hidden = Boolean(video.currentSrc || video.getAttribute("src"));

  const fmt = n => { if (!Number.isFinite(n)) return "0:00"; const s=Math.floor(n); return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; };
  const byId = id => videos.find(v=>v.id===id);
  const favorites = () => store.favorites();
  const isFavorite = id => favorites().includes(id);
  const setFavorite = id => { const f=favorites(); store.set("favorites",isFavorite(id)?f.filter(x=>x!==id):[...f,id]); renderAll(); };
  const history = () => store.history();
  const ordered = () => shuffle ? [...activeList].sort(()=>Math.random()-.5) : activeList;

  function loadVideo(item, autoplay=true) {
    if (!item) return;
    if (currentId && currentId!==item.id) savePosition();
    currentId=item.id;
    keepControlsVisible();
    video.pause(); video.src=item.src; video.load();
    $("videoTitle").textContent=item.title; $("videoDescription").textContent=item.description||"";
    $("videoEmpty").hidden=true; $("centerPlay").hidden=false;
    $("favoriteButton").classList.toggle("is-favorite",isFavorite(item.id));
    $("favoriteButton").setAttribute("aria-pressed",String(isFavorite(item.id)));
    $("favoriteButton").innerHTML=isFavorite(item.id)?"♥ <span>Favorited</span>":"♡ <span>Favorite</span>";
    video.querySelectorAll("track").forEach(t=>t.remove());
    (item.subtitles||[]).forEach((track,i)=>{const el=document.createElement("track");el.kind="subtitles";el.label=track.label||`Track ${i+1}`;el.srclang=track.srclang||"en";el.src=track.src;if(i===0)el.default=true;video.appendChild(el);});
    $("captionButton").hidden=!(item.subtitles||[]).length;
    $("video").dataset.videoId=item.id;
    const pos=store.position(item.id);
    const resume=pos>5;
    const playNow=()=>{if(autoplay)video.play().catch(()=>{});};
    if(resume){
      const choice=confirm(`Resume “${item.title}” from ${fmt(pos)}?\\nChoose Cancel to start from the beginning.`);
      video.addEventListener("loadedmetadata",function restore(){video.currentTime=choice?Math.min(pos,Math.max(0,video.duration-1)):0;video.removeEventListener("loadedmetadata",restore);playNow();},{once:true});
    } else {
      video.addEventListener("loadedmetadata",playNow,{once:true});
    }
    store.addHistory(item.id);
    renderAll();
  }

  function savePosition(){if(currentId&&!video.ended&&Number.isFinite(video.currentTime))store.savePosition(currentId,video.currentTime);}
  function updatePlay(){const playing=!video.paused;$("playButton").textContent=playing?"Ⅱ":"▶";$("playButton").setAttribute("aria-label",playing?"Pause":"Play");$("bigPlay").textContent=playing?"Ⅱ":"▶";$("centerPlay").hidden=playing||!currentId;}
  function play(){if(!currentId){if(videos.length)loadVideo(videos[0]);return;}if(video.paused)video.play().catch(()=>{});else video.pause();}
  function next(){const list=ordered();if(!list.length)return;let index=list.findIndex(v=>v.id===currentId);if(index<0)index=0;else index++;if(index>=list.length){if(repeatMode===2)index=0;else return;}loadVideo(list[index]);}
  function previous(){const list=ordered();let index=list.findIndex(v=>v.id===currentId);if(index>0)loadVideo(list[index-1]);else if(video.currentTime>3)video.currentTime=0;}
  function tile(item,compact=false){const el=document.createElement(compact?"button":"button");el.className=compact?"playlist-item":"video-tile";el.type="button";if(item.id===currentId)el.classList.add("active",...(compact?[]:["selected"]));const img=document.createElement("img");img.src=item.thumbnail;img.alt="";img.loading="lazy";if(compact){const text=document.createElement("span");const strong=document.createElement("strong");strong.textContent=item.title;const small=document.createElement("small");small.textContent=item.category||"Video";text.append(strong,small);el.append(img,text);if(item.id===currentId){const dot=document.createElement("span");dot.className="playing-dot";dot.textContent="●";el.append(dot);}}else{const wrap=document.createElement("div");wrap.className="thumb-wrap";wrap.append(img);const duration=document.createElement("span");duration.className="duration-pill";duration.textContent=item.duration||"Video";wrap.append(duration);const meta=document.createElement("div");meta.className="tile-meta";const title=document.createElement("strong");title.textContent=item.title;const desc=document.createElement("small");desc.textContent=item.description||"A little video";const cat=document.createElement("span");cat.className="category-pill";cat.textContent=item.category||"Video";meta.append(title,desc,cat);el.append(wrap,meta);}if(!item.placeholder)el.addEventListener("click",()=>loadVideo(item));else el.disabled=true;return el;}
  function renderPlaylist(){const box=$("playlistItems");box.replaceChildren();if(!activeList.length){const note=document.createElement("p");note.className="empty-state";note.textContent="Coming soon... Add videos to your collection to start a playlist.";box.append(note);}else ordered().forEach(v=>box.append(tile(v,true)));$("playlistCount").textContent=`${activeList.length} videos`;}
  function renderLibrary(){const term=$("searchInput").value.toLowerCase(),filter=$("filterSelect").value,sort=$("sortSelect").value;let list=(videos.length?[...videos]:[...placeholders]).filter(v=>v.title.toLowerCase().includes(term));if(filter==="favorites")list=list.filter(v=>isFavorite(v.id));if(filter==="history")list=list.filter(v=>history().includes(v.id));if(sort==="az")list.sort((a,b)=>a.title.localeCompare(b.title));if(sort==="watched")list.sort((a,b)=>history().indexOf(a.id)-history().indexOf(b.id));if(sort==="added")list.sort((a,b)=>(b.added||0)-(a.added||0));$("videoGrid").replaceChildren(...list.map(v=>tile(v)));$("emptyState").hidden=!!list.length;$("videoCount").textContent=`${list.length} ${list.length===1?"video":"videos"}`;}
  function renderRecent(){const box=$("recentList");box.replaceChildren();history().map(byId).filter(Boolean).slice(0,8).forEach(v=>{const b=document.createElement("button");b.className="recent-item";b.type="button";const img=document.createElement("img");img.src=v.thumbnail;img.alt="";const span=document.createElement("span");const strong=document.createElement("strong");strong.textContent=v.title;const small=document.createElement("small");small.textContent="Watch again";span.append(strong,small);b.append(img,span);b.addEventListener("click",()=>{loadVideo(v);$("playerCard").scrollIntoView({behavior:"smooth",block:"center"});});box.append(b);});$("recentSection").hidden=!box.children.length;}
  function renderAll(){renderLibrary();renderPlaylist();renderRecent();}
  function toggleFullscreen(){const frame=$("videoFrame");if(document.fullscreenElement)document.exitFullscreen?.();else frame.requestFullscreen?.();}
  function toggleTheater(){document.body.classList.toggle("theater-mode");$("theaterButton").setAttribute("aria-pressed",String(document.body.classList.contains("theater-mode")));}
  function startMini(){if(!currentId)return;const mini=$("miniPlayer"),mv=$("miniVideo");mini.hidden=false;miniActive=true;mv.src=video.currentSrc;mv.currentTime=video.currentTime;mv.playbackRate=video.playbackRate;mv.volume=video.volume;mv.muted=video.muted;mv.play().catch(()=>{});video.pause();miniSyncing=true;mv.addEventListener("timeupdate",()=>{if(miniSyncing&&Math.abs(video.currentTime-mv.currentTime)>.5)video.currentTime=mv.currentTime;});mv.addEventListener("play",()=>{if(video.paused)video.play().catch(()=>{});});mv.addEventListener("pause",()=>{if(!video.paused)video.pause();});}
  function restoreMini(){const mv=$("miniVideo");miniSyncing=false;video.currentTime=mv.currentTime;video.playbackRate=mv.playbackRate;video.volume=mv.volume;video.muted=mv.muted;mv.pause();$("miniPlayer").hidden=true;miniActive=false;video.play().catch(()=>{});}
  $("playButton").addEventListener("click",play);$("bigPlay").addEventListener("click",play);video.addEventListener("click",play);
  $("backButton").addEventListener("click",()=>video.currentTime=Math.max(0,video.currentTime-10));$("forwardButton").addEventListener("click",()=>video.currentTime=Math.min(video.duration||Infinity,video.currentTime+10));
  $("seek").addEventListener("input",e=>{if(video.duration)video.currentTime=(Number(e.target.value)/1000)*video.duration;});
  video.addEventListener("timeupdate",()=>{$("currentTime").textContent=fmt(video.currentTime);$("seek").value=video.duration?video.currentTime/video.duration*1000:0;if(Math.floor(video.currentTime)%10===0)savePosition();});
  video.addEventListener("loadedmetadata",()=>{$("duration").textContent=fmt(video.duration);});video.addEventListener("play",updatePlay);video.addEventListener("pause",updatePlay);video.addEventListener("ended",()=>{if(repeatMode===1){video.currentTime=0;video.play();}else if($("autoplayToggle").checked)next();else updatePlay();});
  $("volume").addEventListener("input",e=>{video.volume=Number(e.target.value);video.muted=video.volume===0;$("muteButton").textContent=video.muted?"🔇":"🔊";});$("muteButton").addEventListener("click",()=>{video.muted=!video.muted;$("muteButton").textContent=video.muted?"🔇":"🔊";});
  $("speed").addEventListener("change",e=>video.playbackRate=Number(e.target.value));
  $("fullscreenButton").addEventListener("click",toggleFullscreen);$("theaterButton").addEventListener("click",toggleTheater);$("miniButton").addEventListener("click",startMini);
  $("pipButton").addEventListener("click",async()=>{try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await video.requestPictureInPicture();}catch(e){alert("Picture-in-picture is not available in this browser.");}});
  $("captionButton").addEventListener("click",()=>{const tracks=video.textTracks;if(!tracks.length)return;let enabled=false;for(let i=0;i<tracks.length;i++)if(tracks[i].mode==="showing")enabled=true;for(let i=0;i<tracks.length;i++)tracks[i].mode=enabled?"disabled":"showing";$("captionButton").classList.toggle("active",!enabled);});
  $("favoriteButton").addEventListener("click",()=>currentId&&setFavorite(currentId));
  $("nextButton").addEventListener("click",next);$("previousButton").addEventListener("click",previous);
  $("shuffleButton").addEventListener("click",()=>{shuffle=!shuffle;$("shuffleButton").setAttribute("aria-pressed",String(shuffle));renderPlaylist();});
  $("repeatButton").addEventListener("click",()=>{repeatMode=(repeatMode+1)%3;$("repeatButton").textContent=["↻ Off","↻ One","↻ All"][repeatMode];$("repeatButton").setAttribute("aria-pressed",String(repeatMode!==0));});
  $("searchInput").addEventListener("input",renderLibrary);$("filterSelect").addEventListener("change",renderLibrary);$("sortSelect").addEventListener("change",renderLibrary);
  $("helpButton").addEventListener("click",()=>$("helpDialog").showModal());$("closeHelp").addEventListener("click",()=>$("helpDialog").close());$("helpDialog").addEventListener("click",e=>{if(e.target===$("helpDialog"))$("helpDialog").close();});
  $("restoreMini").addEventListener("click",restoreMini);$("closeMini").addEventListener("click",()=>{miniSyncing=false;$("miniVideo").pause();$("miniPlayer").hidden=true;miniActive=false;});
  document.addEventListener("keydown",e=>{if(e.target.matches("input,textarea,select,[contenteditable=true]")||$("helpDialog").open)return;const key=e.key.toLowerCase();if(key===" "){e.preventDefault();play();}else if(key==="arrowleft"){e.preventDefault();video.currentTime=Math.max(0,video.currentTime-5);}else if(key==="arrowright"){e.preventDefault();video.currentTime=Math.min(video.duration||Infinity,video.currentTime+5);}else if(key==="arrowup"){e.preventDefault();video.volume=Math.min(1,video.volume+.05);$("volume").value=video.volume;}else if(key==="arrowdown"){e.preventDefault();video.volume=Math.max(0,video.volume-.05);$("volume").value=video.volume;}else if(key==="f")toggleFullscreen();else if(key==="m")$("muteButton").click();});
  window.addEventListener("beforeunload",savePosition);window.addEventListener("pagehide",savePosition);
  activeList=[...videos];renderAll();$("videoEmpty").hidden=false;$("centerPlay").hidden=true;$("captionButton").hidden=true;
})();
