Temple.js
=========

Temple.js is a small javascript browser library for compiling templates to functions.
It is intended to be used on development. When you are ready for production, compile your templates to a javascript file, and use them the same way.


## Development - Usage

Define your templates directly in your html code, or on an external file:

```html
<script id='my-templates' type='text/template'>

    <template name='message' arg='name'>
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


## Documentation

### Templates

A template is defined as a string between a <template> tag and includes two attributes - the template name and the template argument. Current version only accepts one argument per template.

```html
<template name='message' arg='name'>
    <li>Hello {{=name}}</li>
</template>
```

The previous template gets compiled to the following javascript function:

```javascript
function message(name) {
    var out = '<li>Hello ' + (name) + '</li>';
    return out;
};
```

### Functions

Besides templates, you can also define functions that can be useful, for instance, for defining presentation logic.
The main difference between functions and templates, is that the content of functions must be pure javascript code. But, similarly to templates, functions must have a name and an argument.

```html
<function name='beautify' arg='someone'>
    return "Hi" + someone + " you are beautiful!";
</function>
```

is compiled to:

```javascript
function beautify(someone) {
    return "Hi" + someone + " you are beautiful!";
};
```

Basically, temple.js returns the contents of functions as they are defined.


### Template locations

You can define one or more templates inside the html document (for instance, inside a script element with the text attribute to something other than 'text/javascript'), or on an external file.

For external files, use *fromURL(url, callback)* to load the external file asynchronously. Check [this file with several templates and functions](https://github.com/joaoventura/temple.js/blob/master/site/templates.html) for an example.


### Temple.js functions

* fromID(id): Loads templates from an element and returns them as compiled javascript functions ready for use.

* fromURL(url, callback): Loads templates from an external file and returns them as compiled javascript functions ready for use.

* stringFromID(ID): Loads templates from an element and returns them as javascript source code to be used on production.

* stringFromURL(url, callback): Loads templates from an external file and returns them as javascript source code to be used on production.

* build(string): Parses a string with templates and returns compiled javascript.

* buildString(string): Parses a string with templates and returns javascript source code.




## Github page

http://joaoventura.github.io/temple.js/
