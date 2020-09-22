const SCRIPT_LOADER_MAXTIME=5e3;function loadScripts(e){return new ScriptLoader(e,!1).load()}function loadTools(e){return new ScriptLoader(e,!1).load()}function loadPlugins(e){return new ScriptLoader(e,!1).load()}var ScriptLoaderErrors,ScriptLoaderInfo;class ScriptLoader{constructor(e,t,r){this.files=e,ScriptLoaderErrors=[],ScriptLoaderInfo=[],this.nocache=t,this.mode=r||"prod"}static log(e){Array.prototype.push(ScriptLoaderInfo,e)}static error(e){Array.prototype.push(ScriptLoaderErrors,e)}withNoCache(e){return this.nocache&&(-1===e.indexOf("?")?e+="?no_cache="+(new Date).getTime():e+="&no_cache="+(new Date).getTime()),e}loadStyle(e){var t=document.createElement("link"),r=this;t.rel="stylesheet",t.type="text/css",t.href=r.withNoCache(e),t.onload=function(){r.count=r.count-1},t.onerror=function(){ScriptLoader.error('Error loading style "'+e+'".')},r.m_head.appendChild(t)}loadScript(e){var t=document.createElement("script"),r=this;t.type="text/javascript",t.src=r.withNoCache(r.m_js_files[e]);var o=function(){e+1<r.m_js_files.length&&r.loadScript(e+1)};t.onload=function(){r.count=r.count-1,o()},t.onerror=function(){ScriptLoader.error('Error loading script "'+r.m_js_files[e]+'".'),o()},r.m_head.appendChild(t)}loadFiles(){for(var e=0;e<this.m_css_files.length;++e)this.loadStyle(this.m_css_files[e]);this.loadScript(0)}prepare(){function e(e,t){return null!==e&&null!==t&&-1!==e.indexOf(t,e.length-t.length)}this.m_js_files=[],this.m_css_files=[],this.m_head=document.getElementsByTagName("head")[0];var t=this.files;this.count=t.length;for(var r=0;r<this.count;++r)e(t[r],".css")?"prod"==this.mode?this.m_css_files.push("https://cdn.jsdelivr.net/npm/"+t[r]):this.m_css_files.push("node_modules/"+t[r]):e(t[r],".js")?this.m_js_files.push(t[r]):e(t[r],"@latest")?"prod"==this.mode?this.m_js_files.push("https://cdn.jsdelivr.net/npm/"+t[r]):this.m_js_files.push("node_modules/"+t[r]):ScriptLoader.log('Error unknown filetype "'+t[r]+'".')}load(){return new Promise(async(e,t)=>{function r(e){return e=e||2e3,new Promise(t=>setTimeout(()=>t(),e))}this.prepare(),this.loadFiles();let o=5e3;for(var s=window.setInterval((function(){window.clearInterval(s),ScriptLoader.log("Timeout of "+o+"ms for ScriptLoader reached, aborting"),o=0}),o);this.count&&o;)await r(10);this.count?t(new Error("ScriptLoader: "+ScriptLoaderErrors.join("\n"))):e()})}}