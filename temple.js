/*
*  > temple.js
*
*  by João Ventura, Licensed under the MIT licence.
*
*  Temple.js is a template to function compiler.
*  It parses templates and function definitions and exports them as regular
*  javascript functions.
*
*  Temple.js is most useful for the development of your project and when you are
*  ready for production, just compile the templates to javascript, import the
*  script and use it like another javascript file.
*
*  The template compiler is adapted from doT.js by Laura Doktorova
*  - https://github.com/olado/doT
*
*/


var temple = (function() {


    /* === Compiler === */

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




    /* === Parser === */

    // Returns all start/end occurrences of a tag element
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

    // Parses header of an element
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

    // Parses an element
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

    // Parses a string with templates and functions
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


    /* === Builder === */

    // Parses and compiles a string with templates and functions
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

    // Parses and compiles a string with templates and functions
    // Returns a string with the javascript code
    function buildString(string, objectName) {
        objectName = objectName || 'templates';
        var result = 'var ' + objectName + ' = {};\n';
        var elements = parse(string);
        for (var i=0; i<elements.length; i++) {
            var element = elements[i];
            if (element.type === 'template') {
                result += objectName + '.' + element.name +' = function(' + element.arg+ ') {' + compile(element.body) + '};\n';
            } else if (element.type === 'function') {
                result += objectName + '.' + element.name + ' = function(' + element.arg+ ') {' + element.body + '};\n';
            }
        }
        return result;
    }



    /* === Loaders === */

    // Loads a string from an element ID and returns compiled functions
    function fromID(id) {
        var element = document.getElementById(id);
        var string = element.text;
        if (string === undefined)
            string = element.value;
        return build(string);
    }

    // Loads a string from a url and returns compiled functions
    function fromURL(url, callback) {
        var request = new XMLHttpRequest();
        request.open('GET', url);
        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
                var string = request.responseText;
                callback(build(string));
            }
        };
        request.send();
    }

    // Loads a string from an element ID and returns compiled strings
    function stringFromID(id) {
        var element = document.getElementById(id);
        var string = element.text;
        if (string === undefined)
            string = element.value;
        return buildString(string);
    }

    // Loads a string from a url and returns compiled strings
    function stringFromURL(url, callback) {
        var request = new XMLHttpRequest();
        request.open('GET', url);
        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
                var string = request.responseText;
                callbackString(build(string));
            }
        };
        request.send();
    }



    return {
        fromID: fromID,
        fromURL: fromURL,
        stringFromID: stringFromID,
        stringFromURL: stringFromURL,
        build: build,
        buildString: buildString,
    };

})();
