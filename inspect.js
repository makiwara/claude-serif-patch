/* === diagnostic panel: double-click any element to inspect it ===
 * Toggled on via `./patch.sh --debug`. Shows a yellow panel top-right;
 * double-click any element on the page to see its tag, classes, computed
 * font properties, and 10 levels of ancestors. */
(function(){
  function panel(){
    let el=document.getElementById("__claudeInspect");
    if(!el&&document.body){
      el=document.createElement("div");
      el.id="__claudeInspect";
      el.style.cssText="position:fixed;top:12px;right:12px;z-index:2147483647;"
        +"background:rgba(255,235,59,0.96);color:#000;"
        +"font:10px/1.4 ui-monospace,Menlo,monospace;"
        +"padding:8px 10px;border:1px solid #b00;border-radius:4px;"
        +"max-width:480px;max-height:70vh;overflow:auto;"
        +"white-space:pre-wrap;word-break:break-all;"
        +"box-shadow:0 2px 8px rgba(0,0,0,.3);"
        +"pointer-events:auto;user-select:text";
      el.textContent="double-click any element to inspect";
      document.body.appendChild(el);
    }
    return el;
  }
  function chain(el,n){
    const out=[];
    let cur=el,i=0;
    while(cur&&cur!==document.documentElement&&i<n){
      const t=cur.tagName;
      const c=(cur.getAttribute("class")||"").slice(0,250);
      const cs=getComputedStyle(cur);
      const ff=cs.fontFamily.slice(0,50);
      const fs=cs.fontSize;
      const lh=cs.lineHeight;
      out.push(i+": <"+t+">  ff="+ff+"  fs="+fs+"  lh="+lh
        +(c?"\n   cls="+c:""));
      cur=cur.parentElement;
      i++;
    }
    return out;
  }
  function start(){
    panel();
    document.addEventListener("dblclick",function(e){
      const p=panel();
      if(!p)return;
      if(e.target===p||p.contains(e.target))return;
      const lines=["DOUBLE-CLICKED ELEMENT",""].concat(chain(e.target,10));
      p.textContent=lines.join("\n");
    },{capture:true});
  }
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",start);
  else start();
})();
