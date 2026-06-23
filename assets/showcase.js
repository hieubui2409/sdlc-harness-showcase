/* ---------------- language toggle ---------------- */
function setLang(l){
  document.body.classList.toggle('lang-vi', l==='vi');
  document.body.classList.toggle('lang-en', l==='en');
  document.getElementById('btn-en').classList.toggle('active', l==='en');
  document.getElementById('btn-vi').classList.toggle('active', l==='vi');
  document.documentElement.lang = l;
  try{ localStorage.setItem('hs-lang', l); }catch(e){}
}
(function(){ try{ var s=localStorage.getItem('hs-lang'); if(s) setLang(s);}catch(e){} })();

/* honor prefers-reduced-motion across canvas + counters */
var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------------- autonomy dial (HARNESS_AUTONOMY) ---------------- */
var AUTONOMY = {
  0:{en:["default","Auto-runs the per-phase chain. STOPS for a human at exactly two gates: plan-approval and ship.","HARNESS_AUTONOMY=default"],
     vi:["default","Tự chạy chuỗi per-phase. DỪNG chờ người ở đúng 2 chốt: duyệt plan và ship.","HARNESS_AUTONOMY=default"], danger:false},
  1:{en:["ask_all","Stops to ask after EVERY phase. Tightest leash — most human checkpoints.","HARNESS_AUTONOMY=ask_all"],
     vi:["ask_all","Dừng hỏi sau MỖI phase. Dây ngắn nhất — nhiều chốt người nhất.","HARNESS_AUTONOMY=ask_all"], danger:false},
  2:{en:["god","Never stops mid-chain — but trace still records every step. Freedom comes with a paper trail.","HARNESS_AUTONOMY=god"],
     vi:["god","Không bao giờ dừng giữa chuỗi — nhưng trace vẫn ghi đủ mọi bước. Tự do đi kèm dấu vết.","HARNESS_AUTONOMY=god"], danger:true}
};
function renderDial(wrap){
  var v = +(wrap.dataset.autonomy || 0);
  var L = AUTONOMY[v];
  var lang = document.body.classList.contains('lang-vi') ? 'vi' : 'en';
  var d = L[lang];
  var bar = wrap.querySelector('.fstep-bar');
  if(bar) bar.querySelectorAll('button').forEach(function(b,i){ b.classList.toggle('on', i===v); });
  var tag = L.danger
    ? '<span class="dangertag danger">'+(lang==='vi'?'Không dừng · vẫn trace':'No stops · still traced')+'</span>'
    : '<span class="dangertag safe">'+(lang==='vi'?'Có chốt người':'Has human gates')+'</span>';
  var ro = wrap.querySelector('.dial-readout');
  if(ro) ro.innerHTML =
    '<div class="lv" style="color:'+(L.danger?'#fbbf24':'#34d399')+'">'+d[0]+'</div>'+
    '<div class="alias">'+d[2]+'</div>'+
    '<div class="ds" style="margin-top:8px">'+d[1]+'</div>'+
    '<div class="ds" style="margin-top:8px;color:var(--txt-faint)">'+(lang==='vi'
      ?'Mọi mức KHÔNG tự ship: push/pr/ship/deploy luôn qua gate artifact.'
      :'No level auto-ships: push/pr/ship/deploy always pass the artifact gate.')+'</div>'+
    tag;
}
// Wire every autonomy dial independently. quickstart and cook each render one;
// the portable single-file build holds both at once, so an id-based lookup would
// only ever find the first — scope to each .dial-wrap instead.
document.querySelectorAll('.dial-wrap').forEach(function(wrap){
  var bar = wrap.querySelector('.fstep-bar');
  if(!bar) return;
  wrap.dataset.autonomy = '0';
  ['default','ask_all','god'].forEach(function(name,i){
    var b=document.createElement('button'); b.type='button'; b.textContent=name;
    if(i===2) b.classList.add('dgr');
    b.addEventListener('click', function(){ wrap.dataset.autonomy=String(i); renderDial(wrap); });
    bar.appendChild(b);
  });
  renderDial(wrap);
});
// Re-render every dial when the language flips (keeps each one's selected level).
['btn-en','btn-vi'].forEach(function(id){
  var b=document.getElementById(id);
  if(b) b.addEventListener('click', function(){
    document.querySelectorAll('.dial-wrap').forEach(renderDial);
  });
});

/* ---------------- scroll reveal + bar fill + counters ---------------- */
var io = new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(!e.isIntersecting) return;
    // A block taller than the viewport (e.g. the full catalog) can never reach the
    // .16 ratio, so it would stay hidden forever — reveal it the moment it enters.
    // Short blocks still wait for 16% in view to keep the staggered fade-up.
    if(e.intersectionRatio < .16 && e.boundingClientRect.height < innerHeight) return;
    e.target.classList.add('in');
    e.target.querySelectorAll('[data-bars] .bf').forEach(function(b){ b.style.width = b.dataset.w + '%'; });
    e.target.querySelectorAll('[data-count]').forEach(function(n){
      var t = +n.dataset.count, cur = 0, step = Math.max(1, Math.round(t/28));
      if(REDUCED || t===0){ n.textContent=String(t); return; }
      var iv = setInterval(function(){ cur+=step; if(cur>=t){cur=t;clearInterval(iv);} n.textContent=cur; }, 26);
    });
    io.unobserve(e.target);
  });
},{threshold:[0,.16]});
document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

/* ---------------- hero background: 3D constellation (Three.js) ----------------
   Tries a WebGL particle-network scene on the #net canvas; falls back to the 2D
   canvas constellation when Three.js / WebGL is unavailable. Reduced-motion skips
   both (CSS hides #net). Palette-colored to the harness stage hues. */
var HERO_COLORS = ['#38bdf8','#34d399','#fb5e7e','#a78bfa','#fbbf24'];

function init2DNet(){
  var c = document.getElementById('net'); if(!c) return;
  var x = c.getContext('2d'), W,H,pts,raf;
  function size(){ W=c.width=innerWidth; H=c.height=Math.max(innerHeight, 700); init(); }
  function init(){
    var n = Math.min(64, Math.floor(W/26)); pts = [];
    for(var i=0;i<n;i++) pts.push({x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.28, vy:(Math.random()-.5)*.28, c:HERO_COLORS[i%HERO_COLORS.length]});
  }
  function draw(){
    x.clearRect(0,0,W,H);
    for(var i=0;i<pts.length;i++){
      var p=pts[i]; p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
      x.beginPath(); x.arc(p.x,p.y,1.6,0,6.28); x.fillStyle=p.c; x.globalAlpha=.8; x.fill();
      for(var j=i+1;j<pts.length;j++){
        var q=pts[j], dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy);
        if(d<128){ x.globalAlpha=(1-d/128)*.22; x.strokeStyle=p.c; x.lineWidth=1; x.beginPath(); x.moveTo(p.x,p.y); x.lineTo(q.x,q.y); x.stroke(); }
      }
    }
    x.globalAlpha=1; if(!REDUCED) raf=requestAnimationFrame(draw);
  }
  size(); draw();
  addEventListener('resize', function(){ cancelAnimationFrame(raf); size(); draw(); });
  document.addEventListener('visibilitychange', function(){ if(document.hidden){cancelAnimationFrame(raf);} else if(!REDUCED){draw();} });
}

function _dotTexture(){
  var s=64, cv=document.createElement('canvas'); cv.width=cv.height=s;
  var g=cv.getContext('2d'), grd=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  grd.addColorStop(0,'rgba(255,255,255,1)'); grd.addColorStop(.35,'rgba(255,255,255,.55)'); grd.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grd; g.fillRect(0,0,s,s);
  return new THREE.CanvasTexture(cv);
}
function initHero3D(){
  var c = document.getElementById('net');
  if(!c || !window.THREE) return false;
  var renderer;
  try{ renderer = new THREE.WebGLRenderer({canvas:c, alpha:true, antialias:true}); }
  catch(e){ return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  var scene = new THREE.Scene();
  var cam = new THREE.PerspectiveCamera(60, innerWidth/Math.max(innerHeight,700), 1, 400);
  cam.position.z = 64;
  var group = new THREE.Group(); scene.add(group);

  var N = Math.min(150, Math.max(70, Math.floor(innerWidth/12)));
  var R = 46, pos = new Float32Array(N*3), col = new Float32Array(N*3), nodes = [];
  var pal = HERO_COLORS.map(function(h){ return new THREE.Color(h); });
  for(var i=0;i<N;i++){
    var v = new THREE.Vector3((Math.random()*2-1)*R, (Math.random()*2-1)*R*0.7, (Math.random()*2-1)*R);
    nodes.push(v); pos[i*3]=v.x; pos[i*3+1]=v.y; pos[i*3+2]=v.z;
    var cc = pal[i%pal.length]; col[i*3]=cc.r; col[i*3+1]=cc.g; col[i*3+2]=cc.b;
  }
  var pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(col,3));
  var pmat = new THREE.PointsMaterial({size:2.6, map:_dotTexture(), vertexColors:true, transparent:true,
    depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:true, opacity:.95});
  group.add(new THREE.Points(pgeo, pmat));

  // static links between near nodes (fixed inside the rotating group)
  var lp=[], lc=[], TH=15, MAXL=320, cnt=0;
  for(var a=0;a<N && cnt<MAXL;a++) for(var b=a+1;b<N && cnt<MAXL;b++){
    if(nodes[a].distanceTo(nodes[b])<TH){
      lp.push(nodes[a].x,nodes[a].y,nodes[a].z, nodes[b].x,nodes[b].y,nodes[b].z);
      var ca=pal[a%pal.length]; lc.push(ca.r,ca.g,ca.b, ca.r,ca.g,ca.b); cnt++;
    }
  }
  var lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp),3));
  lgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lc),3));
  var lmat = new THREE.LineBasicMaterial({vertexColors:true, transparent:true, opacity:.14, blending:THREE.AdditiveBlending, depthWrite:false});
  group.add(new THREE.LineSegments(lgeo, lmat));

  var mx=0, my=0, tx=0, ty=0, raf;
  addEventListener('mousemove', function(e){ tx=(e.clientX/innerWidth-.5); ty=(e.clientY/innerHeight-.5); });
  function resize(){ var h=Math.max(innerHeight,700); renderer.setSize(innerWidth,h,false); cam.aspect=innerWidth/h; cam.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);
  function frame(){
    group.rotation.y += .0009; group.rotation.x += .00035;
    mx += (tx-mx)*.04; my += (ty-my)*.04;
    cam.position.x = mx*16; cam.position.y = -my*12; cam.lookAt(0,0,0);
    renderer.render(scene, cam);
    if(!REDUCED) raf=requestAnimationFrame(frame);
  }
  frame();
  document.addEventListener('visibilitychange', function(){ if(document.hidden){cancelAnimationFrame(raf);} else if(!REDUCED){frame();} });
  return true;
}
(function(){ if(REDUCED) return; if(!initHero3D()) init2DNet(); })();

/* ---------------- single-file hash router ---------------- */
/* Active ONLY in the portable build (every page wrapped in a [data-route] panel).
   In the multipage build there are no wrappers, so this no-ops and the baked
   .active nav class is left untouched. */
(function(){
  var panels = document.querySelectorAll('[data-route]');
  if(!panels.length) return;
  var navlinks = document.querySelectorAll('[data-nav]');
  function snap(panel){
    panel.querySelectorAll('.reveal:not(.in)').forEach(function(el){ el.classList.add('in'); });
    panel.querySelectorAll('[data-bars] .bf').forEach(function(b){ b.style.width = b.dataset.w + '%'; });
    panel.querySelectorAll('[data-count]').forEach(function(n){ n.textContent = n.dataset.count; });
  }
  function route(force){
    var h = (location.hash || '').replace(/^#\/?/,'') || 'hub';
    var active = null;
    panels.forEach(function(p){ if(p.dataset.route===h) active=p; });
    if(!active){ h='hub'; panels.forEach(function(p){ if(p.dataset.route==='hub') active=p; }); }
    panels.forEach(function(p){ p.hidden = (p!==active); });
    navlinks.forEach(function(a){ a.classList.toggle('active', a.dataset.nav===h); });
    document.body.classList.toggle('view-home', h==='hub');
    document.body.classList.toggle('view-guide', h!=='hub');
    document.body.classList.remove('side-open');   /* close the drawer on navigation */
    if(force && active) snap(active);
    window.scrollTo(0,0);
  }
  addEventListener('hashchange', function(){ route(true); });
  route(false);
})();

/* ---------------- mobile sidebar drawer (multipage + portable) ---------------- */
(function(){
  var toggle = document.querySelector('[data-side-toggle]');
  if(!toggle) return;
  var scrim = document.querySelector('[data-scrim]');
  function set(open){
    document.body.classList.toggle('side-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  toggle.addEventListener('click', function(){ set(!document.body.classList.contains('side-open')); });
  if(scrim) scrim.addEventListener('click', function(){ set(false); });
  addEventListener('keydown', function(e){ if(e.key==='Escape') set(false); });
  document.querySelectorAll('.docs-side .side-link').forEach(function(a){
    a.addEventListener('click', function(){ set(false); });
  });
})();

/* ---------------- right "On this page" TOC + scroll-spy ---------------- */
/* Builds the TOC from the active content's <h2 id> headings. Works for both the
   multipage guides (active = .docs-main) and the portable router (active = the
   visible [data-route] panel); rebuilt on hashchange. TOC clicks scroll only —
   they never touch the hash, so the portable router's route is left intact. */
(function(){
  var tocEl = document.querySelector('[data-toc]');
  var layout = document.querySelector('.docs-layout');
  if(!tocEl || !layout) return;
  var spy = null;
  function activeRoot(){
    return document.querySelector('[data-route]:not([hidden])') || document.querySelector('.docs-main');
  }
  function build(){
    if(spy){ spy.disconnect(); spy = null; }
    var root = activeRoot();
    var heads = root ? root.querySelectorAll('h2[id]') : [];
    tocEl.innerHTML = '';
    if(!heads.length){ layout.classList.remove('has-toc'); return; }
    var label = document.createElement('div');
    label.className = 'toc-h';
    label.innerHTML = '<span class="en">On this page</span><span class="vi">Trên trang này</span>';
    tocEl.appendChild(label);
    var links = [];
    heads.forEach(function(h){
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.innerHTML = h.innerHTML;            /* keeps the en/vi spans so lang toggle works */
      a.addEventListener('click', function(e){
        e.preventDefault();
        h.scrollIntoView({behavior: REDUCED ? 'auto' : 'smooth', block: 'start'});
        h.setAttribute('tabindex', '-1');     /* let the heading take focus so SR/keyboard users land there */
        h.focus({preventScroll: true});
        document.body.classList.remove('side-open');
      });
      tocEl.appendChild(a);
      links.push({id:h.id, a:a});
    });
    layout.classList.add('has-toc');
    spy = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        links.forEach(function(l){
          var on = l.id === e.target.id;
          l.a.classList.toggle('active', on);
          if(on){ l.a.setAttribute('aria-current', 'true'); } else { l.a.removeAttribute('aria-current'); }
        });
      });
    }, {rootMargin:'0px 0px -70% 0px', threshold:0});
    heads.forEach(function(h){ spy.observe(h); });
  }
  build();
  addEventListener('hashchange', function(){ setTimeout(build, 0); });
})();

/* ---------------- telemetry: same lens, multiple formats ---------------- */
(function(){
  var tabs=document.getElementById('teltabs'); if(!tabs) return;
  var cmd=document.getElementById('telcmd');
  tabs.querySelectorAll('button').forEach(function(b){
    b.addEventListener('click', function(){
      var f=b.dataset.fmt;
      tabs.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
      document.querySelectorAll('.fmt-pane').forEach(function(p){ p.classList.toggle('on', p.dataset.pane===f); });
      if(cmd) cmd.textContent=f;
    });
  });
})();
