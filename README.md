Temple.js
=========

Temple.js is a small javascript browser library for compiling templates to functions.
It is intended to be used on development. When you are ready for production, compile your templates to a javascript file, and use them the same way.


## Development - Usage

Define your templates directly in your html code, or on an external file:

```html
<script id='my-templates' type='text/template'>

    <template name='message'  arg='name'>
        <li>Hello {{=name}}</li>
    </template>

    <template name='greet' arg='names'>
        <ul>
        {{for (var i=0; i<names.length; i++) { }}
            {{=this.message(names[i])}}
        {{ } }}
        </ul>
    </template>

</script>

```

Compile your templates to javascript functions and invoke them directly:

```javascript
var templates = temple.fromID('my-templates');
templates.greet(['Andrew', 'Betty', 'Charles']);
```

```html
<ul>
    <li>Hello Andrew</li>
    <li>Hello Betty</li>
    <li>Hello Charles</li>
</ul>

```


## Production - Generate javascript source

When you are ready for production, generate the javascript source code:

```javascript
temple.stringFromID('my-templates');
```

```javascript
var templates = {};

templates.message = function (name) {
    var out = '<li>Hello ' + (name) + '</li>';
    return out;
};

templates.greet = function (names) {
    var out = '<ul>';
    for (var i = 0; i < names.length; i++) {
        out += (this.message(names[i]));
    }
    out += '</ul>';
    return out;
};

```

Copy-paste it to a javascript file (e.g. 'templates.js'), and use its functions like in any other javascript file.

```html
<script src='templates.js'></script>
<script>
    templates.greet(['Andrew', 'Betty', 'Charles']);
</script>
```

You can also use the generator at site/index.html to compile your templates to javascript source code.



## Github page

http://joaoventura.github.io/temple.js/
