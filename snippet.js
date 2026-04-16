/* === local patch: inline-style applier for Claude Code prose ===
 * claude.ai's utility classes win the author/user cascade even with
 * !important, so we write directly to element.style with 'important'
 * priority. Element inline style at !important beats any stylesheet. */
(function(){
  const PROSE_FONT={
    "font-family":'var(--font-serif, "Anthropic Serif", Georgia, serif)',
    "font-size":"15px",
    "line-height":"1.7",
    "font-weight":"400"
  };
  const RULES=[
    {sel:"p.text-assistant-primary, p.text-body.text-pretty",
     props:PROSE_FONT,mark:"__sA"},
    {sel:"li.text-assistant-primary, li.text-body.text-pretty, li.text-body, .epitaxy-chat-column li",
     props:PROSE_FONT,mark:"__sAL"},
    {sel:".epitaxy-chat-column :is(h1,h2,h3,h4,h5,h6)",
     props:PROSE_FONT,mark:"__sAH"},
    {sel:".epitaxy-chat-column",
     props:{"max-width":"1000px","margin-left":"auto","margin-right":"auto"},
     mark:"__sB"}
  ];
  function applyRule(el,r){
    if(el[r.mark])return;
    try{for(const k in r.props)el.style.setProperty(k,r.props[k],"important");el[r.mark]=1;}catch(e){}
  }
  function applyAll(el){for(const r of RULES){if(el.matches&&el.matches(r.sel))applyRule(el,r);}}
  function scan(root){try{for(const r of RULES){(root||document).querySelectorAll(r.sel).forEach(el=>applyRule(el,r));}}catch(e){}}
  function start(){
    scan();
    const mo=new MutationObserver(muts=>{
      for(const m of muts){
        if(m.type==="childList"){
          m.addedNodes.forEach(n=>{if(n.nodeType===1){applyAll(n);scan(n);}});
        } else if(m.type==="attributes"&&m.target.nodeType===1){
          const t=m.target;
          for(const r of RULES){if(t.matches&&t.matches(r.sel)){t[r.mark]=0;applyRule(t,r);}}
        }
      }
    });
    mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
    setInterval(scan,2000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else if(document.body)start();
  else document.addEventListener("DOMContentLoaded",start);
})();
