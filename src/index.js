/*!
* Dynamic script Loader for js and css files 
*
* @version 4.1.0
* @package https://github.com/sosie-js/script-loader
*/

/**
* @Note Adapted from https://stackoverflow.com/questions/14521108/dynamically-load-js-inside-js
* @author sos-productions.com
* @example await loadScripts([ "foo.js",'bar.css",...])
* @history
*    1.0.0 (11.09.2020) - Initial version 
*    1.2.0 (14.09.2020) - npm support only for prod
*    1.3.0 (18.09.2020) - Fix version and dates, improving load functions (beta)
*    2.0.0 (22.09.2020) - Unified Load functions with getScriptLoaderFiles + webpack
*    2.1.0 (23.09.2020) - Support for branch in github urls
*    2.2.0 (25.09.2020) - resolveScriptSourceToFile added with better source support (works for css too)
*    2.3.0 (01.10.2020) - nocache can be forced locally using # such as {'#user/plugin@version':[...]}
*    3.0.0 (04.10.2020) - currentScript and resolvePathname support
*    3.1.0 (15.10.2020) - getAbsoluteFilepath to fix resolvePathname exception for string starting with ../
*    3.2.0 (23.10.2020) - package version and anti cache works (before not)
*    4.0.0 (24.10.2020) - new core with fetchText and..source coherency works!
*    4.1.0 (03.11.2020) - resolvePathname is now common for js and css files
**/

var parseGithubUrl = require('parse-github-url');
const chalk = require('chalk');
const log = console.log;

const SCRIPT_LOADER_MAXTIME=9000; //in ms


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
                            files.push(reloc+base+'/'+entry);
                            sources.push({repository:repository, branch:branch, reloc:reloc,base: base});
                        }
                    });
            } else {
                if(mode == 'dev') entries=entries.replace('dist/bundle.js','src/index.js');
                if(files != null) {
                    files.push(reloc+base+'/'+entries);
                    sources.push({repository:repository, branch:branch, reloc:reloc,base: base});
                }
            }
        } else { //remote
            reloc='';
            if(branch =='latest') {
                    if(files != null) {
                        files.push(source); //npmjsdeliver
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
 global.loadEditor = function(modules, nocache, mode, target) {
     
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
global.loadScripts = function (scripts, nocache, mode) {
    const sl = new ScriptLoader(scripts, nocache, mode);
    return sl.load(undefined);

}

global.getFileContent = function (url) {
   const sl = new ScriptLoader();
  return sl.getFileContent(url);
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
            
            filename=this.resolvePathname(filename);
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
      * Feature test
      * 
      * @return {Boolean} If true, required methods and APIs are supported
      */
      supports() {
              return 'XMLHttpRequest' in window && 'JSON' in window && 'Promise' in window;
      } 
        
     /**   
      * fetch content by url
      * 
      * @param {String} url - the url of the file to fetch content
      * @param {boolean} nocache - true to disable caching
      * @param {function} onreadystatechange - custom handler
      * @returns {Promise}
      */
     fetchText(url, nocache, onreadystatechange, options ) {
          
          // Check browser support
          if (!this.supports()) throw 'script-loader: This browser does not support the methods used in this plugin.';

          // Default settings
          var settings, defaults = {
            method: 'GET',
            username: null,
            password: null,
            data: {},
            responseType: 'text',
            timeout: null,
            withCredentials: false
          };
          
         

          /**
	 * Merge two or more objects together.
	 * @param   {Object}   objects  The objects to merge together
	 * @returns {Object}            Merged values of defaults and options
	 */
	var extend = function () {

		// Variables
		var extended = {};

		// Merge the object into the extended object
		var merge = function (obj) {
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					if (Object.prototype.toString.call(obj[prop]) === '[object Object]') {
						extended[prop] = extend(extended[prop], obj[prop]);
					} else {
						extended[prop] = obj[prop];
					}
				}
			}
		};

		// Loop through each object and conduct a merge
		for (var i = 0; i < arguments.length; i++) {
			var obj = arguments[i];
			merge(obj);
		}

		return extended;

	};
          
         // Merge options into defaults
          settings = extend(defaults, options || {});
        
          if(nocache) {
            /*
              http://www.itgeared.com/articles/1401-ajax-browser-cache-issues-fix/ 
             // See: https://support.microsoft.com/en-us/help/234067/how-to-prevent-caching-in-internet-explorer
            setHeaders: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache'
            }*/
           options={
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': 'Sat, 14 Jan 2012 01:00:00 GMT'
              }
            };
            
            // adjust settings
            settings = extend(settings,options);
            
          } else {
           /* options={
                headers: {
                'Content-type': 'application/x-www-form-urlencoded'
              }
            };*/
          }

          var oXmlHttp = new XMLHttpRequest();            
         
        
          /**
           * Promisify this with improvements using wonderful article 
           * of https://gomakethings.com/promise-based-xhr/
           * based on https://github.com/cferdinandi/atomic/blob/master/src/js/atomic/atomic.js
           * 
          oXmlHttp.onload = onload;
          oXmlHttp.onreadystatechange = onreadystatechange
          XmlHttp.open(method, url, true);
          oXmlHttp.send();
          */
	return new Promise(function (resolve, reject) {

                oXmlHttp.onload = function () {
          
                   if( this.status >= 200 || this.status == XMLHttpRequest.DONE ) {
                     if(settings.responseType == 'text') {
                       if(this.responseText !== null) {
                            resolve(oXmlHttp);
                       }else {
                            reject({
                                    status: 204,
                                    statusText: 'No content'
                            });
                       }
                     }
                   }
                }
          
		// Setup our listener to process compeleted requests
		oXmlHttp.onreadystatechange = onreadystatechange || function () {

			// Only run if the request is complete
			if (oXmlHttp.readyState !== 4) return;
                           
			// Process the response
			if (oXmlHttp.status >= 200 && oXmlHttp.status < 400) {
				// If successful
				resolve(oXmlHttp);
			} else {
				// If failed
				reject({
					status: oXmlHttp.status,
					statusText: oXmlHttp.statusText
				});
			}

		};

                // Setup our HTTP request
                oXmlHttp.open(settings.method, url, true, settings.username, settings.password);
                oXmlHttp.responseType = settings.responseType;
                
                // Add headers
                for (var header in settings.headers) {
                        if (settings.headers.hasOwnProperty(header)) {
                                oXmlHttp.setRequestHeader(header, settings.headers[header]);
                        }
                }

                // Set timeout
                if (settings.timeout) {
                        oXmlHttp.timeout = settings.timeout;
                        oXmlHttp.ontimeout = function (e) {
                                reject({
                                        status: 408,
                                        statusText: 'Request timeout'
                                });
                        };
                }

                // Add withCredentials
                if (settings.withCredentials) {
                        oXmlHttp.withCredentials = true;
                }
                
		// Send the request
		oXmlHttp.send();

	});
  
     }

     
        //Extracted from https://gist.github.com/Yaffle/1088850
      //maybe https://github.com/webcomponents/polyfills/blob/master/packages/url/url.js
      resolvePathname(pathname) {
          var output = [];
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
          pathname = output.join("").replace(/^\//, pathname.charAt(0) === "/" ? "/" : "");
          return pathname;
      }
     
     
    /**
     * Get the text file content by url
     * 
     *@note if no url, given, return the code of the page, this is better than other techniques such as new * new XMLSerializer().serializeToString(document) washes comments but this one asynchronous not 
     *    
     *@param {String} url - the url 
     *@param {function} handler - a function triggred on success like
     *@   function (request) { 
     *     // resolve
     *     content = request.responseText;
     *     return content ;
     *     }
     **/
     getFileContent(url,handler) {
        url = url || window.location.href;
        var _this=this;
        const fetchResponse=(async function() { var d=await _this.fetchText(this.resolvePathname(url), false);return d})();
        fetchResponse.then(handler).catch(function (error) { //reject
            console.error('getFileContent ERROR :'+ error);
        });
     }
   
  
          
    /**
     * Load as the js file by its index
     * 
     * @param {integer} i, the index in the list of filenames
     * */
       loadScript(i)
        {
        
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
            nocache=_this.nocache || nocache;
            
           let url=filename; //_this.withNoCache(filename, nocache); incompatible with post
           
            var loadNextScript = function ()
            {
                if (i + 1 < _this.m_js_files.length)
                {
                    _this.loadScript(i + 1);
                }
            };
            
            
            url=this.resolvePathname(url);
            
            this.fetchText(url,nocache,function onreadystatechange () {
              
                if(this.readyState == this.HEADERS_RECEIVED) {
                    //404 triggers an html page seen as normal so we have to intercept it
                    var contentType = this.getResponseHeader("Content-Type");
                    //console.log(url,contentType);
                    if (!(/^(application\/javascript)/.test(contentType))) { //charset=utf-8
                        this.abort();
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
            }).then(function (request) { // resolve
              
              const code = request.responseText.replace('${currentScript}',url);
              
              // version coherency checking system
              function check_match(source, code) {
                const version=/@version\s+([\d\.\w]+)/.exec(code).slice(1)[0];
                if(version == source.branch) {
                  console.info('Script ' + source.base + ' package version "'+ version+'" matches source branch, this is very good'); 
                } else {
                  console.log('Script ' + source.base + ' package version "'+ version + '" differs with source branch "' + source.branch + '", something may be twisted');
                }
              }
              
              if(source && /@version/.test(code)) {
                check_match(source, code);
              } else if (( source.repository == 'https://github.com/codex-team/editor.js' ) && (/editor.js.LICENSE.txt/.test(code))){
                
                 var xhr = new XMLHttpRequest();
                 xhr.open("GET", url.replace('dist/editor.js','dist/editor.js.LICENSE.txt'), false);
                 xhr.send('');
                 
                 var versions=(xhr.responseText+'').match(/@version\s+([\d\.\w]+)/g);
                 check_match(source, versions[1]);
                
              } else if(!/sample.js/.test(url)) {
                  console.log(chalk.bold.rgb(10, 100, 200)('Script package "' + source.base + '" ('+source.repository+') has no @version information in source header, this is not recommended for '+url));
              }
              
                var oHead = document.getElementsByTagName('HEAD').item(0);
                var oScript = document.createElement("script");
                    oScript.language = "javascript";
                    oScript.type = "text/javascript";
                    oScript.defer = true;
                    oScript.text = code;
                    oHead.appendChild(oScript);
                _this.count=_this.count-1;
                loadNextScript();
                
            })
            .catch(function (error) { //reject
                console.error(error.status,error.statusText); 
            });
              
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
