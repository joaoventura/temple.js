Temple.js
=========

*Sane web development with templates*.

Temple.js is a small javascript library which helps you with the development of your templates.

You declare your templates inline or on external files, and use temple.js to load and compile them for you. When you are ready for production, compile your templates to javascript source code, and let temple.js get out of your way.

Temple.js templates support Javascript logic inside. You can declare variables, invoke functions and use for loops inside the templates. They are pretty powerfull!


## Basic Usage

### During development

Declare your templates inline in your HTML or on an external file. Each template must have a name and an argument.

```html

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

```

Use temple.js to load your templates and use them.

```javascript

temple.fromURL('templates.html', function (templates) {
    var string = templates.greet(['Andrew', 'Betty', 'Charles']);
});

```

```html
<ul>
    <li>Hello Andrew</li>
    <li>Hello Betty</li>
    <li>Hello Charles</li>
</ul>

```

You can also use the templates inline with your HTML, using `temple.fromID(id)` for retrieving the templates from an element with ID *id*.
*Check the samples for more examples.*


### For production

Use temple.js to generate the javascript source code of your templates.


```javascript

temple.sourceFromURL('templates.html', 'mytemplates', function (source) {
    console.log(source);
});

```

This will print the template's source code to the console.

```javascript

var mytemplates = {};

mytemplates.message = function (name) {
    var out = '<li>Hello ' + (name) + '</li>';
    return out;
};

mytemplates.greet = function (names) {
    var out = '<ul>';
    for (var i = 0; i < names.length; i++) {
        out += (this.message(names[i]));
    }
    out += '</ul>';
    return out;
};


```

Just copy-paste this source code into a new javascript file (or inline in your HTML) and use it directly on your own javascript code. There's no more need for temple.js in your project.

```javascript

var string = mytemplates.greet(['Andrew', 'Betty', 'Charles']);

```


In alternative, you can use [this online generator](http://joaoventura.github.io/temple.js/generator/index.html) to compile your templates to javascript source code.




## Documentation


### Templates

A template is defined as a string between a <template> tag and includes two attributes - the template name and the template argument. Temple.js only accepts one argument per template.

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

Internally, temple.js just compiles templates to functions. During development of your templates, it does it automatically for you, and for production you just grab your template's javascript source code.


### Functions

Besides templates, you can also define functions that can be useful, for instance, for defining presentation logic.
The main difference between functions and templates, is that the content of functions must be pure javascript code. But, similarly to templates, functions must have a name and an argument. For instance,

```html
<function name='beautify' arg='someone'>
    var x = 0;
    return "Hi" + someone + " you are beautiful!";
</function>
```

gets compiled to:

```javascript
function beautify(someone) {
    var x = 0;
    return "Hi" + someone + " you are beautiful!";
};
```

Basically, temple.js returns the contents of functions as they are defined.


### Template logic

Since templates will eventually get compiled to javascript source code, this means that you can use javascript code inside your templates. This is a very powerfull mechanism.

```html
<template name='message' arg='name'>
    {{var someNumber = Math.random();}}
    {{var idiot = name + ' is idiot!';}}
    <li>Hello {{=idiot}}</li>
</template>
```

The previous template gets compiled to the following javascript function:

```javascript
function message(name) {
    var out = '';
    var someNumber = Math.random();
    var idiot = name + ' is idiot!';
    out += '<li>Hello ' + (idiot) + '</li>';
    return out;
};

```
Notice the *semicolon* after the variable declarations and function calls, and the *equal sign* when we want to use a variable or a function's result as string and concatenate it to the return variable `out`.

Another powerfull mechanism is the invocation of sub templates in your templates. This allows you to modularize your code.

```html

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

```

Notice how we must use the `this` keyword to reference the *message* template, and how we use the *equal sign* to append the message string to the result of the *greet* template.



### Template locations

You can define one or more templates inside the html document (for instance, inside a script element with the text attribute to something other than 'text/javascript'), or on an external file. For external files, use `fromURL(url, callback)` to load the external file asynchronously.

When you need greater modularity, you can create multiple template files (or elements) and use them under the same namespace. You just need to declare them when loading your templates, using for instance `fromURL(['template1.html' ,'template2.html'], function(mytemplates) {});`.

Check the samples for more examples for loading templates and functions inline, or from external files.


### Public functions

* `fromID(id)`: Loads templates given an element ID (or array of IDs) and returns them as ready-to-use functions.

* `fromURL(url, callback)`: Loads templates from an url (or array of urls) and returns them as ready-to-use functions.

* `sourceFromID(id, namespace)`: Loads templates given an element ID (or array of IDs) and returns them as javascript source code with a given namespace, so that they can be used in production.

* `sourceFromURL(url, namespace, callback)`: Loads templates from an url (or array of urls) and returns them as javascript source code with a given namespace, so that they can be used in production.

* `build(string)`: Parses a string with templates and returns them as compiled javascript.

* `buildString(string)`: Parses a string with templates and returns them as javascript source code.



## Resources:

* Github Page: http://joaoventura.github.io/temple.js/
* Online generator: http://joaoventura.github.io/temple.js/generator/index.html
