/**
    * Dynamic script Loader for js and css files 
    *
    * @Note adapted from https://stackoverflow.com/questions/14521108/dynamically-load-js-inside-js
    * @author sos-productions.com
    * @version 3.1
    * @example await loadScripts([ "foo.js",'bar.css",...])
    * @history
    *    1.0 (11.09.2020) - Initial version 
    *    1.2 (14.09.2020) - npm support only for prod
    *    1.3 (18.09.2020) - Fix version and dates, improving load functions (beta)
    *    2.0 (22.09.2020) - Unified Load functions with getScriptLoaderFiles + webpack
    *    2.1 (23.09.2020) - Support for branch in github urls
    *    2.2 (25.09.2020) - resolveScriptSourceToFile added with better source support (works for css too)
    *    2.3 (01.10.2020) - nocache can be forced locally using # such as {'#user/plugin@version':[...]}
    *    3.0 (04.10.2020) - currentScript and resolvePathname support 
    *    3.1 (15.10.2020) - getAbsoluteFilepath to fix resolvePathname exception for string starting with ../
    **/

var parseGithubUrl = require('parse-github-url');

const SCRIPT_LOADER_MAXTIME=5000; //in ms


function resolveScriptSourceToFile(files, mode, type, sources, source, value, target) {
    
    let repository, base, branch, entries, git, anchor, file;
    
    branch='master';
    if((version = /@([\w\d\.]+)$/.exec(source)) !== null) {
        branch=version[1];
    }
   
    base=value;
    repository='';
    if(Array.isArray(value)) {
        if((anchor = /\[(.*?)\]\(([^\)]+)\)/.exec(value[0])) !== null) {
            base=anchor[1];
            repository=anchor[2];//github
            //Extract repository, branch from github url
            //<protocol:https>//<host:github.com>/<repo>/tree:<branch>
            git=parseGithubUrl(repository)
            repository=git.protocol+'//'+git.host+'/'+git.repo
            if((branch=='master')||(branch=='latest'))  branch=git.branch;
        } else {
            base=value[0];
        }
        if(value.length ==2) {
            entries=value[1];
        } else {
            entries='dist/bundle.js';
        }
    
       function getAbsoluteFilepath(reloc, base, sep, entry ) {
         
            //Extracted from https://gist.github.com/Yaffle/1088850 and 
            //add an exception for ../ as pathname normaly starts with / 
           function resolvePathname(pathname) {
                var output = [];
                
                var h,head=(h=/^(\.\.\/)/.exec(pathname)) ? h[1] : '';
                
                pathname.replace(/^(\.\.?(\/|$))+/, "")
                    .replace(/\/(\.(\/|$))+/g, "/")
                    .replace(/\/\.\.$/, "/../")
                    .replace(/\/?[^\/]*/g, function (p) {
                    if (p === "/..") {
                        output.pop();
                    } else {
                        output.push(p);
                    }
                    });
                pathname = head + output.join("").replace(/^\//, pathname.charAt(0) === "/" ? "/" : "");
                return pathname;
           }
            
         
           return resolvePathname([reloc, base, sep, entry].join(''));
       }
    
    
        if((local=/^local(?:\:(.*))?/.exec(target))!== null) {
            
            if(local[1]) {
                reloc=local[1]+'/';
            }else {
                reloc='';
            }
                
            if(Array.isArray(entries)) {
                    entries.forEach(function(entry){
                        if(mode == 'dev') entry=entry.replace('dist/bundle.js','src/index.js');
                        if(files != null) {
                            files.push(getAbsoluteFilepath(reloc, base, '/', entry));
                            sources.push({repository:repository, branch:branch, reloc:reloc,base: base});
                        }
                    });
            } else {
                if(mode == 'dev') entries=entries.replace('dist/bundle.js','src/index.js');
                if(files != null) {
                    files.push(getAbsoluteFilepath(reloc, base, '/', entries));
                    sources.push({repository:repository, branch:branch, reloc:reloc,base: base});
                }
            }
        } else { //remote
            reloc='';
            if(branch =='latest') {
                    if(files != null) {
                        files.push(getAbsoluteFilepath(source, '', '', '')); //npmjsdeliver
                        sources.push({repository:repository, branch:branch, reloc:reloc,base: base});
                    }
            }else {
                    //not supported
            }
        }
        
    } else {
    
            console.info('Load'+type+': Virtual packet '+source);
    }
}



function getScriptLoaderFiles(mode, type, items, sources, target) {

    let files=[]
  
    items.forEach(function(item){
        
         if(typeof item == 'string') {
            files.push(source+':'+item);
        } else {
            for (const [source, value] of Object.entries(item)) {
                resolveScriptSourceToFile(files, mode, type, sources, source, value, target);
            }
        }
    })   

    return files;
}

/**
 * @param {array}  files list of tools
 * @param {boolean} nocache , if true activate the anti-cache system, disabled by default
 * @param {string}  mode - dev or prod
 * @param {string}  target - local or remote/origin
*/
global.loadTools = function(tools,nocache,mode,target) {
    
    let sources= []
    let type='tool'
    let files=getScriptLoaderFiles(mode, type, tools, sources, target);
    const sl = new ScriptLoader(files, nocache, mode, type);
    return sl.load(sources);
    
}


/**
 * @param {array}  files list of plugins
 * @param {boolean} nocache , if true activate the anti-cache system, disabled by default
 * @param {string}  mode - dev or prod
 * @param {string}  target - local or remote/origin
*/
global.loadPlugins = function(plugins, nocache, mode, target) {

    let sources= []
    let type='plugin'
    let files=getScriptLoaderFiles(mode, type, plugins, sources, target);
    const sl = new ScriptLoader(files, nocache, mode, type);
    return sl.load(sources);
    
}

/**
 * @param {array}  list of core modules
 * @param {boolean} nocache , if true activate the anti-cache system, disabled by default
 * @param {string}  mode - dev or prod
 * @param {string}  target - local or remote/origin
*/
 global.loadEditor = function(modules,nocache,mode, target) {
     
    let sources= []
    let type='editor'
    let files=getScriptLoaderFiles(mode, type, modules, sources, target);
    const sl = new ScriptLoader(files, nocache, mode, type);
    return sl.load(sources);

}

/**
 * Helper to load script files
 * 
 * @param {array} files list of css or js files to load
 * @param {boolean} nocache , if true activate the anti-cache system, disabled by default
 * @param {string}  mode - dev or prod
 **/
global.loadScripts = function(scripts,nocache,mode) {
    const sl = new ScriptLoader(scripts,nocache,mode);
    return sl.load(undefined);

}



var ScriptLoaderErrors;
var ScriptLoaderInfo;    

/**
 * @class ScriptLoader
 * @classdesc The dynamic loader of scripts to load Tools ansd Plugins on the fly for Editor.js 2.0
 */
class ScriptLoader { 
    
    
     /**
     * Setup the ScriptLoader
     * 
     * @constructor
     * @param {array}  files liste of files
     * @param {boolean} nocache , if true activate the anti-cache system, deulat isabled
     * @param {string}  mode - dev or prod
     * 
     * */
  constructor (files,nocache,mode, group) {
    this.files = files
    ScriptLoaderErrors = [];
    ScriptLoaderInfo = [];
    this.nocache=nocache;
    this.sources=[];
    this.mode=mode||'prod';
    this.group=group||'script';
  }

    /**
     * Add a message to the error log stack
     * 
     * @param {string} error, the text description of the error
     * */
      static log(info)
        {
            ScriptLoaderInfo.push(info);
        }
        
      static error(error)
        {
            ScriptLoaderErrors.push(error);
        }
        
    /**
     * Append an anti cache to url if active
     * 
     * @param {String} filename, the full url to the css file
     * @param {Boolean} cache - overiddes this.nocache if set to true
     * */
  withNoCache(filename, nocache)
        {
            if(this.nocache||nocache) {
                console.info('Nocache for '+filename);
                if (filename.indexOf("?") === -1)
                    filename += "?no_cache=" + new Date().getTime();
                else
                    filename += "&no_cache=" + new Date().getTime();
            }
            return filename;
        }
    
    /**
     * Load as Stylesheet CSS file
     * 
     * @param {String} filename, the full url to the css file
     * */
    loadStyle(fileentry)
        {
        
            // HTMLLinkElement
            var link = document.createElement("link");
            var _this=this;
            link.rel = "stylesheet";
            link.type = "text/css";
          
            var filedef=fileentry.split(':');
            var sourceindex=filedef[0];
            var filename=filedef[1];
            //console.log('LoadStyle('+sourceindex+'):'+fileentry);
            link.href = _this.withNoCache(filename);
            //ScriptLoader.log('Loading style ' + filename);
            link.onload = function ()
            {
                //ScriptLoader.log('Loaded style "' + filename + '".');
                _this.count=_this.count-1;
                
            };
            link.onerror = function ()
            {
                ScriptLoader.error('Error loading style "' + filename + '".');
                    if(_this.sources) {
                              //console.info();
                           let source=_this.sources[sourceindex]
                              
                            let branch=(source.branch=='latest') ? '' : '-b '+source.branch+' ';
                                    console.info('loadStyle:To fix it, from '+source.reloc+ ' do a "git submodule add '+branch+'-f '+source.repository+' '+source.base+'"')
                                
                    }

            };

            _this.m_head.appendChild(link);
        }
        
        
    /**
     * Load as the js file by its index
     * 
     * @param {integer} i, the index in the list of filenames
     * */
       loadScript(i)
        {
          /* 
           *!NOTE THIS DOES NOT PRODUCE ERROR when 404 html error pages
           * var script = document.createElement('script');
            var _this=this;
            script.type = 'text/javascript';
            script.src = _this.withNoCache(_this.m_js_files[i]);
            var loadNextScript = function ()
            {
                if (i + 1 < _this.m_js_files.length)
                {
                    _this.loadScript(i + 1);
                }
            };
            script.onload = function ()
            {
                //ScriptLoader.log('Loaded script "' + _this.m_js_files[i] + '".');
                _this.count=_this.count-1;
                loadNextScript();
            };
            script.onerror = function ()
            {
                ScriptLoader.error('Error loading script "' + _this.m_js_files[i] + '".');
                loadNextScript();
            };
            //_this.log('Loading script "' + _this.m_js_files[i] + '".');
            _this.m_head.appendChild(script);*/
           var _this=this;
           let fileentry=_this.m_js_files[i];
           
            var filedef=fileentry.split(':');
            var sourceindex=filedef[0];
            var filename=filedef[1];
           

            let source, nocache=false;
            if(_this.sources) {
                 source=_this.sources[sourceindex]; 
                 nocache=/^#/.test(source)
            }
            
           let url=_this.withNoCache(filename, nocache);
           
            var loadNextScript = function ()
            {
                if (i + 1 < _this.m_js_files.length)
                {
                    _this.loadScript(i + 1);
                }
            };
            
       
            
	   var oXmlHttp = new XMLHttpRequest();          
           
	 	oXmlHttp.withCredentials = false;
		oXmlHttp.responseType = 'text';
  
		oXmlHttp.open('GET', url, true);
		oXmlHttp.onload = function () {

		  if( oXmlHttp.status >= 200 || oXmlHttp.status == XMLHttpRequest.DONE ) {

		    //var x = oXmlHttp.getAllResponseHeaders();
		    //console.log(x);

		    if(oXmlHttp.responseText !== null) {

		        var oHead = document.getElementsByTagName('HEAD').item(0);
		        var oScript = document.createElement("script");
		            oScript.language = "javascript";
		            oScript.type = "text/javascript";
		            oScript.defer = true;
		            oScript.text = oXmlHttp.responseText.replace('${currentScript}',url);
		            oHead.appendChild(oScript);
                        _this.count=_this.count-1;
                        loadNextScript();
		    }

		  } 

		}

		oXmlHttp.send();
                oXmlHttp.onreadystatechange = function() {
                    let source, branch;
                    if(this.readyState == this.HEADERS_RECEIVED) {
                        //404 triggers an html page seen as normal so we have to intercept it
                        var contentType = oXmlHttp.getResponseHeader("Content-Type");
                        //console.log(url,contentType);
                        if (!(/^(application\/javascript)/.test(contentType))) { //charset=utf-8
                           oXmlHttp.abort();
                            ScriptLoader.error('Error loading '+_this.group+' file "' + url + '" ('+contentType+').')
                            
                            if(source) {
                              //console.info();
                                //source=_this.sources[sourceindex] //.replace(/^#/,"")
                                if(/editor.js$/.test(source.base)) {
                                    console.info('loadScript:To fix it, from editor.js do a "git submodule add '+branch+'-f '+source.repository+' src/editor.js" and then ./build and copy src/editor.js/dist/* under editor.js/dist/');
                                } else {   
                                    branch=(source.branch=='latest') ? '' : '-b '+source.branch+' ';
                                    console.info('loadScript: To fix it, from '+source.reloc+ ' do a "git submodule add '+branch+'-f '+source.repository+' '+source.base+'"')
                                }
                            }

                            loadNextScript();
                        }
                    }
                }	    
        }
        
        
    /**
     * Process the load of files
     * 
     * */
       loadFiles()
        {
            // ScriptLoader.log(this.m_css_files);
            // ScriptLoader.log(this.m_js_files);
            for (var i = 0; i < this.m_css_files.length; ++i)
                this.loadStyle(this.m_css_files[i]);
            this.loadScript(0);
        }
        
        
        
    /**
     * Prpare the list of file by separating CSS from JS
     * 
     * */
     prepare() {
         
            let npmjsdeliver='https://cdn.jsdelivr.net/npm/';
            let npmlocal='node_modules/';
         
            this.m_js_files = [];
            this.m_css_files = [];
            this.m_head = document.getElementsByTagName("head")[0];
            // this.m_head = document.head; // IE9+ only
            function endsWith(str, suffix)
            {
                if (str === null || suffix === null)
                    return false;
                return str.indexOf(suffix, str.length - suffix.length) !== -1;
            }
            
            var files=this.files;
            this.count=files.length;
            for (var i = 0; i < this.count; ++i)
            {
                if (endsWith(files[i], ".css"))
                {
                     this.m_css_files.push(i+':'+files[i]); //i to keep a link with sources
                    /* if(this.mode == 'prod') {
                        this.m_css_files.push(npmjsdeliver+files[i]);
                     } else {
                        this.m_css_files.push(npmlocal+files[i]);
                     }*/
                }
                else if (endsWith(files[i], ".js"))
                {
                    this.m_js_files.push(i+':'+files[i]);
                }
                else if (endsWith(files[i], "@latest"))
                {
                    if(this.mode == 'prod') {
                        this.m_js_files.push(i+':'+npmjsdeliver+files[i]);
                    }else {
                        this.m_js_files.push(i+':'+npmlocal+files[i]);
                    }
                }
                else
                    ScriptLoader.log('Error unknown filetype "' + files[i] + '".');
               
            }    
         
     }
 
/**
 * Main function to load it all
 */
    load (sources) {
        
        this.sources=sources;
        
        return new Promise(async (resolve, reject) => {
        
            this.prepare();
            
            this.loadFiles();
            
            //this.checkWorkIfFinishedIn(SCRIPT_LOADER_MAXTIME);

            function delay(n) {
                n = n || 2000;
                return new Promise(done => setTimeout(() => done(), n));
            }
            
            var _this=this;
            let  t=SCRIPT_LOADER_MAXTIME; 
            //watchdog
            var intervalId = window.setInterval(function() {
                
                window.clearInterval(intervalId);
                ScriptLoader.log('Timeout of '+t+'ms for ScriptLoader reached, aborting');
                t=0;
            }, t);
            
            while(this.count&&t) {
                await delay(10); 
            }
           
            if(this.count) {
                reject(new Error("ScriptLoader failed "+this.count+" time(s): "+ ScriptLoaderErrors.join('\n')))
            }else {    
                resolve()
            }
            
        })
    }

}

module.exports = ScriptLoader;
