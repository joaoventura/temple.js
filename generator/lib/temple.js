/*
*  > temple.js
*
*  Temple.js is a small javascript library for compiling templates into
*  functions.
*
*  It is most useful when you are developing templates for your web
*  applications. You can define your templates inline or on external
*  files, and use them as regular javascript functions.
*
*  Temple.js templates supports full javascript logic inside them, like
*  declaring variables, invoking functions, use loops, etc.
*
*  When you are ready for production, you can compile your templates to
*  javascript source code, and import them like any other javascript file.
*  The templates are just javascript functions, and are invoked the same
*  way either in development or in production.
*
*
*  The template compiler is adapted from doT.js by Laura Doktorova.
*  - https://github.com/olado/doT/
*
*  Temple.js is developed by João Ventura and Licensed under the MIT licence.
*  - https://github.com/joaoventura/temple.js
*
*/


var temple = (function() {



    /************************
    *       Compiler        *
    ************************/

    var compiler = {
		templateSettings: {
			evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
			interpolate: /\{\{=([\s\S]+?)\}\}/g,
			encode:      /\{\{!([\s\S]+?)\}\}/g,
			use:         /\{\{#([\s\S]+?)\}\}/g,
			useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
			define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
			defineParams:/^\s*([\w$]+):([\s\S]+)/,
			conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
			iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
			varname:	'it',
			strip:		true,
			append:		true,
			selfcontained: false
		},
		template: undefined, //fn, compile template
		compile:  undefined  //fn, for express
    }

    function encodeHTMLSource() {
		var encodeHTMLRules = {"&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' }
        var matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
		return function() {
			return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
		};
	}
    this.encodeHTML = encodeHTMLSource();

    var startend = {
		append: { start: "'+(",      end: ")+'",      endencode: "||'').toString().encodeHTML()+'" },
		split:  { start: "';out+=(", end: ");out+='", endencode: "||'').toString().encodeHTML();out+='"}
	}
    var skip = /$^/;

    function unescape(code) {
		return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, ' ');
	}

    function template(tmpl, c) {
		c = c || compiler.templateSettings;
		var cse = c.append ? startend.append : startend.split, needhtmlencode, sid = 0, indv;
        var str = tmpl;

		str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,'')
					.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,''): str)
			.replace(/'|\\/g, '\\$&')
			.replace(c.interpolate || skip, function(m, code) {
				return cse.start + unescape(code) + cse.end;
			})
			.replace(c.encode || skip, function(m, code) {
				needhtmlencode = true;
				return cse.start + unescape(code) + cse.endencode;
			})
			.replace(c.conditional || skip, function(m, elsecase, code) {
				return elsecase ?
					(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
					(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
			})
			.replace(c.iterate || skip, function(m, iterate, vname, iname) {
				if (!iterate) return "';} } out+='";
				sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
				return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"
					+vname+"=arr"+sid+"["+indv+"+=1];out+='";
			})
			.replace(c.evaluate || skip, function(m, code) {
				return "';" + unescape(code) + "out+='";
			})
			+ "';return out;")
			.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r')
			.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, '')
			.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

		if (needhtmlencode && c.selfcontained) {
			str = "String.prototype.encodeHTML=(" + encodeHTMLSource.toString() + "());" + str;
		}

        return str;

	};

	function compile(tmpl) {
		return template(tmpl, null);
	};



    /************************
    *         Parser        *
    ************************/

    // Returns all (start / end) occurrences of a tag element.
    function findAllElements(string, tag) {

        var pos = [];
        var curr = 0, start = -1, end = -1;
        while (curr >= 0) {
            start = string.indexOf('<'+tag, curr)
            if (start >= 0) {
                end = string.indexOf('</'+tag+'>', start)
                end += tag.length+3;
                pos[pos.length] = [start, end]
                curr = end + 1;
            } else {
                curr = -1;
            }
        }
        return pos;
    }

    // Parses the header of an element.
    function parseHeader(header) {

        var element = {}
        header = header.split(' ');
        element.type = header[0];
        for (var i=1; i<header.length; i++) {
            var attr = header[i];
            if (attr.length > 0) {
                attr = attr.split('=');
                if (attr[1][0] == "'" || attr[1][0] == '"') {
                    attr[1] = attr[1].slice(1, -1);
                }
                element[attr[0]] = attr[1];
            }
        }
        return element
    }

    // Parses an element.
    function parseElement(string) {

        // Header
        var headerStart = string.indexOf('<') + 1;
        var headerEnd = string.indexOf('>');
        var element = parseHeader(string.slice(headerStart, headerEnd));

        // Body
        var bodyStart = headerEnd + 1;
        var bodyEnd = string.lastIndexOf('<');
        element.body = string.slice(bodyStart, bodyEnd);
        return element;
    }

    // Parses a string with templates and functions.
    function parse(string) {

        var elements = [];

        // Finds all occurrences of template
        var templatePos = findAllElements(string, 'template')
        for (var i=0; i<templatePos.length; i++) {
            var a = templatePos[i][0];
            var b = templatePos[i][1];
            var elem = parseElement(string.slice(a,b));
            elements[elements.length] = elem;
        }

        // Finds all occurrences of function
        var functionPos = findAllElements(string, 'function')
        for (var i=0; i<functionPos.length; i++) {
            var a = functionPos[i][0];
            var b = functionPos[i][1];
            var elem = parseElement(string.slice(a,b));
            elements[elements.length] = elem;
        }

        return elements;
    }



    /************************
    *       Builders        *
    ************************/

    // Returns compiled templates from a string with templates.
    function build(string) {

        var result = {};
        var elements = parse(string);
        for (var i=0; i<elements.length; i++) {
            var element = elements[i];
            if (element.type === 'template') {
                result[element.name] = new Function(element.arg, compile(element.body));
            } else if (element.type === 'function') {
                result[element.name] = new Function(element.arg, element.body);
            }
        }
        return result;
    }

    // Returns the JS source code from a string with templates.
    // The namespace is an argument.
    function buildString(string, namespace) {

        namespace = namespace || 'templates';
        var result = 'var ' + namespace + ' = {};\n';
        var elements = parse(string);
        for (var i=0; i<elements.length; i++) {
            var element = elements[i];
            if (element.type === 'template') {
                result += namespace + '.' + element.name +' = function(' + element.arg+ ') {' + compile(element.body) + '};\n';
            } else if (element.type === 'function') {
                result += namespace + '.' + element.name + ' = function(' + element.arg+ ') {' + element.body + '};\n';
            }
        }
        return result;
    }



    /************************
    *     String Loaders    *
    ************************/

    // Loads the string contents of all elements given their ID.
    // Returns contents as array of strings.
    function loadStringsFromIDs(IDs) {

        var strings = [];
        for (var i=0; i<IDs.length; i++) {
            var element = document.getElementById(IDs[i]);
            var string = element.text;
            if (string === undefined) {
                string = element.value;
            }
            strings[i] = string;
        }
        return strings;
    }

    // Loads the string contents of all files given their URL.
    // Returns contents as array of strings through the callback.
    function loadStringsFromURLs(URLs, callback) {

        var strings = [];
        var requests = [];
        var done = 0;

        for (var i=0; i<URLs.length; i++) {
            requests[i] = new XMLHttpRequest();
            requests[i].open('GET', URLs[i]);
            requests[i].onreadystatechange = function(i) {

                return function() {
                    if (requests[i].readyState == 4) {
                        done += 1;
                        strings[i] = '';
                        if (requests[i].status == 200) {
                            strings[i] = requests[i].responseText;
                        }
                    }
                    if (done === URLs.length) {
                        callback(strings);
                    }
                };
            }(i);
            requests[i].send();
        }
    }



    /************************
    *     Public Loaders    *
    ************************/

    // Returns built templates from element or array of elements.
    function fromID(param) {

        var IDs = (param instanceof Array) ? param : [param];
        var strings = loadStringsFromIDs(IDs);
        strings = strings.join('\n');
        return build(strings);
    }

    // Returns built templates from url or array of urls.
    function fromURL(param, callback) {

        var URLs = (param instanceof Array) ? param : [param];
        loadStringsFromURLs(URLs, function (strings) {
            strings = strings.join('\n');
            callback(build(strings));
        });
    }

    // Returns template source code from element or array of elements.
    // Accepts the ID or Array of IDs and the namespace.
    function sourceFromID(param, namespace) {

        var IDs = (param instanceof Array) ? param : [param];
        var strings = loadStringsFromIDs(IDs);
        strings = strings.join('\n');
        return buildString(strings, namespace);
    }

    // Returns template source code from url or array of urls.
    // Accepts the URL or Array of URLs, the namespace and callback.
    function sourceFromURL(param, namespace, callback) {

        var URLs = (param instanceof Array) ? param : [param];
        loadStringsFromURLs(URLs, function (strings) {
            strings = strings.join('\n');
            callback(buildString(strings, namespace));
        });
    }



    /************************
    *    Public functions   *
    ************************/

    return {
        // Loaders
        fromID: fromID,
        fromURL: fromURL,
        sourceFromID: sourceFromID,
        sourceFromURL: sourceFromURL,

        // Builders
        build: build,
        buildString: buildString,
    };

})();
