/**
    * Dynamic script Loader for js and css files 
    *
    * @Note adapted from https://stackoverflow.com/questions/14521108/dynamically-load-js-inside-js
    * @author sos-productions.com
    * @version 1.2
    * @example await loadScripts([ "foo.js",'bar.css",...])
    * @history
    *    1.0 (11.09.2020) - Initial version 
    *    1.2 (14.09.2020) npm support only for prod
    **/
const SCRIPT_LOADER_MAXTIME=5000; //in ms

/**
 * Helper to load script files
 * 
 * @param {array} files list of css or js files to load
 **/
 function loadScripts(files) {

    const sl = new ScriptLoader(files,false);
    return sl.load();

}

function loadTools(tools) {

    const sl = new ScriptLoader(tools,false);
    return sl.load();

}

function loadPlugins(plugins) {

    const sl = new ScriptLoader(plugins,false);
    return sl.load();

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
     * */
  constructor (files,nocache,mode) {
    this.files = files
    ScriptLoaderErrors = [];
    ScriptLoaderInfo = [];
    this.nocache=nocache;
    this.mode=mode||'prod';
  }

    /**
     * Add a message to the error log stack
     * 
     * @param {string} error, the text description of the error
     * */
      static log(info)
        {
            Array.prototype.push(ScriptLoaderInfo,info);
        }
        
      static error(error)
        {
            Array.prototype.push(ScriptLoaderErrors,error);
        }
        
    /**
     * Append an anti cache to url if active
     * 
     * @param {string} filename, the full url to the css file
     * */
  withNoCache(filename)
        {
            if(this.nocache) {
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
     * @param {string} filename, the full url to the css file
     * */
    loadStyle(filename)
        {
        
            // HTMLLinkElement
            var link = document.createElement("link");
            var _this=this;
            link.rel = "stylesheet";
            link.type = "text/css";
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
            var script = document.createElement('script');
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
            _this.m_head.appendChild(script);
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
                     if(this.mode == 'prod') {
                        this.m_css_files.push(npmjsdeliver+files[i]);
                     } else {
                        this.m_css_files.push(npmlocal+files[i]);
                     }
                }
                else if (endsWith(files[i], ".js"))
                {
                    this.m_js_files.push(files[i]);
                }
                else if (endsWith(files[i], "@latest"))
                {
                    if(this.mode == 'prod') {
                        this.m_js_files.push(npmjsdeliver+files[i]);
                    }else {
                        this.m_js_files.push(npmlocal+files[i]);
                    }
                }
                else
                    ScriptLoader.log('Error unknown filetype "' + files[i] + '".');
            }    
         
     }
 
/**
 * Main function to load it all
 */
    load () {
        
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
                reject(new Error("ScriptLoader: "+ ScriptLoaderErrors.join('\n')))
            }else {    
                resolve()
            }
            
        })
    }

}
