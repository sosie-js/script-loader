![](https://badgen.net/badge/SoS正/Beta/f2a) ![](https://badgen.net/badge/editor.js/v2.0/blue) ![](https://badgen.net/badge/plugin/v1.0/orange) 

# scriptLoader Plugin to load Tools of editor.js

## Feature(s)

Provides an uniformized way to load tool and scripts thus instead of having:

```html

<script src="https://cdn.jsdelivr.net/npm/@editorjs/header@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/simple-image@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/delimiter@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/list@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/checklist@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/quote@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/code@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/embed@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/link@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/warning@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/underline@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/marker@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/inline-code@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/raw@latest"></script>
<script src="https://cdn.jsdelivr.net/npm/@editorjs/paragraph@latest"></script>

```

we will have:

```html
   /**
     * configure the Editor Tools before the Editor being initialized
     * @note Hack because for now we cannot have async constructors
     * @param {EditorConfig|string|undefined} [configuration] - user configuration
     * @param {boolean] custom , if not specified use demo by default.
     * @return promise<EditorJS>
     */
    async function new_SoSIE(configuration,custom) {
    
       ...
        
        const nocache=false;
        const mode='prod';

        /**
        * Load Tools
        */
        await loadTools([
            '@editorjs/header@latest',
            '@editorjs/simple-image@latest',
            '@editorjs/delimiter@latest',
            '@editorjs/list@latest',
            '@editorjs/checklist@latest',
            '@editorjs/quote@latest',
            '@editorjs/code@latest',
            '@editorjs/embed@latest',
            '@editorjs/table@latest',
            '@editorjs/link@latest',
            '@editorjs/warning@latest',
            '@editorjs/marker@latest',
            '@editorjs/inline-code@latest',
            '@editorjs/editorjs@latest',
            '@editorjs/paragraph@latest'
        ],nocache,mode);
        
        ...
    }

```
NOTE: in the near future this thing will be handled with .ini files and the support for dev submodules
will be included. Git submodules is a pain to resfresh and add so automatizing it, so I assume
it will be a great help to have this feature.

## Integration

1) Add the loader on top

```html
 <script src="editor.js/plugins/script-loader/src/index.js"></script>
```

2) You will have to adapt the loader as we can pass the configuration directly but wraping it into
a function and have to add a promise support. Now we have:

```html
 /**
     * To initialize the Editor, create a new instance with configuration object
     * @see docs/installation.md for mode details
     */
     var editor=new_SoSIE(function(){ return {
    
      /**
       * Wrapper of Editor
       */
      holder: 'editorjs',

      /**
       * Tools list
       */
      tools: {
        /**
         * Each Tool is a Plugin. Pass them via 'class' option with necessary settings {@link docs/tools.md}
         */
        header: {
          class: Header,
          inlineToolbar: ['link'],
          config: {
            placeholder: 'Header'
          },
          shortcut: 'CMD+SHIFT+H'
        },

      ...
      },
      onReady: function(){
	saveButton.click();
      },
      onChange: function() {
	console.log('something changed');
      }
    };}).then(editor => {
	//Don't forget to convert promise to object back because async return a promise
	window.editor=editor;
    });

```

3) Inside, new_SoSIE(configuration,custom), configuration becomes configuration()

```js
        
  
        let ct=new ToolConfigurator(configuration());
        
        //This will avoid to hardcode sanitize rules in Paragraph tool.
        //and use our rules defined in paragraph.text.allowedTags
        //to avoid washing style tags deliberately by default (p tag is mandatory!)
        await ct.awaitFinished('Paragraph',500);
        
        //checkConfigFinished('Paragraph');
        var editor=new SoSIE(configuration(),custom);
         
        /**
        * Saving example
        */
        saveButton.addEventListener('click', function () {
            editor.save().then((savedData) => {
                cPreview.show(savedData, document.getElementById("output"));
            });
        });
         
         
        return editor;
```

## Building the plugin

To produce the dist/bundle.js for production use the command: 

```shell
yarn build
```

## Want to give a try?

Play with [SoSie](http://sosie.sos-productions.com/)
