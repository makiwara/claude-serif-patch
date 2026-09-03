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
    {sel:".prose p",
     props:PROSE_FONT,mark:"__sA"},
    {sel:".prose li",
     props:PROSE_FONT,mark:"__sAL"},
    {sel:".prose :is(h1,h2,h3,h4,h5,h6)",
     props:Object.assign({},PROSE_FONT,{"font-weight":"600"}),mark:"__sAH"},
    {sel:".epitaxy-transcript-width",
     props:{"max-width":"1000px","margin-left":"auto","margin-right":"auto"},
     mark:"__sB"},
    // User turns: restore blue bubble, left-aligned (claude.ai now renders
    // them grey + right). .epitaxy-user-turn (turn wrapper) is the stable
    // anchor; the bubble carries .bg-neutral, the row aligns right via
    // items-end + ms-auto.
    // ms-auto + items-end now sit on .epitaxy-user-turn itself (claude.ai moved
    // them off the descendant row). The turn is flex-col, so items-end is what
    // right-aligns the bubble — override align-items here, on the element.
    {sel:".epitaxy-user-turn",
     props:{"align-self":"flex-start","align-items":"flex-start","margin-left":"0","margin-inline-start":"0","margin-right":"auto",
            // Bubble bg is now bg-[var(--cds-bg-user-message)] (was .bg-neutral).
            // Override the variable on the turn; it inherits to the bubble.
            "--cds-bg-user-message":"#edf3fa"},
     mark:"__sU"},
    {sel:".epitaxy-user-turn > div",
     props:{"align-items":"flex-start","margin-inline-start":"0","margin-left":"0"},
     mark:"__sUR"},
    // Neutralize any right-pushing utility anywhere in the turn (covers
    // attachment rows, which live in a different subtree than the text row).
    {sel:".epitaxy-user-turn .ms-auto",
     props:{"margin-inline-start":"0","margin-left":"0"},mark:"__sUM"},
    {sel:".epitaxy-user-turn .items-end",
     props:{"align-items":"flex-start"},mark:"__sUE"},
    {sel:".epitaxy-user-turn .justify-end",
     props:{"justify-content":"flex-start"},mark:"__sUJ"},
    {sel:".epitaxy-user-turn .self-end",
     props:{"align-self":"flex-start"},mark:"__sUS"},
    {sel:".epitaxy-user-turn .bg-neutral",
     props:{"background-color":"#edf3fa","color":"#125c9c"},
     mark:"__sUB"},
    {sel:".epitaxy-user-turn .text-body",
     props:{"color":"#125c9c"},mark:"__sUT"},
    // Bubble text is now .text-primary (was .text-body); color it blue too.
    {sel:".epitaxy-user-turn .text-primary",
     props:{"color":"#125c9c"},mark:"__sUP"}
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
