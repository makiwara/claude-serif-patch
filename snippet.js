/* === local patch: inline-style applier for Claude Code prose ===
 * claude.ai's utility classes win the author/user cascade even with
 * !important, so we write directly to element.style with 'important'
 * priority. Element inline style at !important beats any stylesheet.
 *
 * Safety: coalesce all work into one rAF-scheduled scan. No attribute
 * observer, no setInterval. The childList observer is enough — React
 * adds/removes nodes during hydration and streaming; a single scan per
 * frame is both sufficient and cheap. */
(function(){
  const PROSE_FONT={
    "font-family":'var(--font-serif, "Anthropic Serif", Georgia, serif)',
    "font-size":"15px",
    "line-height":"1.7"
  };
  const RULES=[
    {sel:".epitaxy-markdown p",
     props:PROSE_FONT,mark:"__sA"},
    {sel:".epitaxy-markdown li",
     props:PROSE_FONT,mark:"__sAL"},
    {sel:".epitaxy-markdown :is(h1,h2,h3,h4,h5,h6)",
     props:Object.assign({},PROSE_FONT,{"font-weight":"600"}),mark:"__sAH"},
    {sel:".epitaxy-chat-column",
     props:{"max-width":"1000px","margin-left":"auto","margin-right":"auto"},
     mark:"__sB"}
  ];
  let pending=false;
  function scan(){
    pending=false;
    try{
      for(const r of RULES){
        const els=document.querySelectorAll(r.sel);
        for(let i=0;i<els.length;i++){
          const el=els[i];
          if(el[r.mark])continue;
          for(const k in r.props)el.style.setProperty(k,r.props[k],"important");
          el[r.mark]=1;
        }
      }
    }catch(e){}
  }
  function schedule(){
    if(pending)return;
    pending=true;
    (window.requestAnimationFrame||setTimeout)(scan,16);
  }
  function start(){
    try{
      schedule();
      const mo=new MutationObserver(schedule);
      mo.observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else if(document.body)start();
  else document.addEventListener("DOMContentLoaded",start);
})();
