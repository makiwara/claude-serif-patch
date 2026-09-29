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
  const U=".epitaxy-chat-panel [data-cds=UserMessage]";
  const RULES=[
    {sel:".prose p",
     props:PROSE_FONT,mark:"__sA"},
    {sel:".prose li",
     props:PROSE_FONT,mark:"__sAL"},
    {sel:".prose :is(h1,h2,h3,h4,h5,h6)",
     props:Object.assign({},PROSE_FONT,{"font-weight":"600"}),mark:"__sAH"},
    // Transcript column: .epitaxy-transcript-width is gone. Columns
    // ([data-epitaxy-chat-column]) now size via --max-content-width, which
    // falls back through var(--chat-column-measure, 768/960/1280px) per the
    // native transcript-width setting. Set the measure once on the Code-tab
    // root; surfaces that set their own measure (overview rail, empty state)
    // still override it locally.
    {sel:".epitaxy-root",
     props:{"--chat-column-measure":"1000px"},
     mark:"__sB"},
    // User messages: restore blue bubble, left-aligned (claude.ai renders them
    // grey + right). The Code tab now uses the shared UserMessage component
    // (.epitaxy-user-turn is gone): the row is [data-cds=UserMessage] with
    // ms-auto + items-end, the bubble is bg-[var(--cds-bg-user-message)]
    // text-primary. Scoped to .epitaxy-chat-panel so claude.ai chat is untouched.
    {sel:U,
     props:{"align-items":"flex-start","margin-left":"0","margin-inline-start":"0","margin-right":"auto",
            // Inherits to the bubble's bg-[var(--cds-bg-user-message)].
            "--cds-bg-user-message":"#edf3fa"},
     mark:"__sU"},
    // Neutralize any right-pushing utility inside the message (attachment and
    // reaction rows; also matches variants like [...]:justify-end).
    {sel:U+" .ms-auto",
     props:{"margin-inline-start":"0","margin-left":"0"},mark:"__sUM"},
    {sel:U+" .items-end",
     props:{"align-items":"flex-start"},mark:"__sUE"},
    {sel:U+' [class*="justify-end"]',
     props:{"justify-content":"flex-start"},mark:"__sUJ"},
    {sel:U+" .self-end",
     props:{"align-self":"flex-start"},mark:"__sUS"},
    {sel:U+" .bg-neutral",
     props:{"background-color":"#edf3fa"},mark:"__sUB"},
    {sel:U+" .text-primary",
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
