/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/engine.ts":
/*!***********************!*\
  !*** ./src/engine.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Engine": () => (/* binding */ Engine)
/* harmony export */ });
/* harmony import */ var _logs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./logs */ "./src/logs.ts");
/* harmony import */ var _options__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./options */ "./src/options.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils */ "./src/utils.ts");



class Engine {
    constructor() {
        this.logTag = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.getElementById)('log', HTMLDivElement);
        this.stackTraceCountTag = (0,_utils__WEBPACK_IMPORTED_MODULE_2__.getElementById)('stack-trace-count', HTMLSpanElement);
        this.logLines = [];
        this.options = _options__WEBPACK_IMPORTED_MODULE_1__.Options.create();
    }
    static instance() {
        return (0,_utils__WEBPACK_IMPORTED_MODULE_2__.requireType)(window.engine, Engine);
    }
    load(text) {
        // Parse log lines
        let lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let { time, source, level, message } = parsePrefixLine(line);
            // Inspect if this is the first line of a stack trace
            const exceptionMatch = /^([A-Za-z0-9\.]+): /.exec(line);
            if (exceptionMatch !== null) {
                let prev = this.peek();
                if (prev === null) {
                    continue;
                }
                const exceptionType = exceptionMatch[1];
                const exceptionMessage = message.substring(exceptionMatch[0].length);
                const exception = prev.pushException(exceptionType);
                let latestException = exception;
                exception.push(exceptionMessage);
                // Capture stack trace(s)
                for (i++; i < lines.length; i++) {
                    const stackTraceLine = lines[i];
                    if (/^[ \t]+at /.test(stackTraceLine) || /^[ \t]+\.\.\. [0-9]+ more/.test(stackTraceLine)) {
                        latestException.pushTrace(stackTraceLine);
                        continue;
                    }
                    const causeMatch = /^Caused by: ([A-Za-z0-9\.]+): /.exec(stackTraceLine);
                    if (causeMatch !== null) {
                        const causeType = causeMatch[1];
                        const causeMessage = stackTraceLine.substring(causeMatch[0].length);
                        latestException = latestException.pushCause(causeType);
                        latestException.push(causeMessage);
                        continue;
                    }
                    let futurePrefix = parsePrefixLine(stackTraceLine);
                    if (futurePrefix.time === null && futurePrefix.level === null && futurePrefix.source === null && latestException.trace.length == 0) {
                        // If we hit a recognized line, then we abort parsing.
                        // Otherwise, we accumulate lines as part of the exception message *if* it's not already part of the stack trace.
                        latestException.push(stackTraceLine);
                        continue;
                    }
                    // Did not recognize this line; abort and continue;
                    break;
                }
                i--;
                continue;
            }
            if (time === null || source === null || level === null) {
                this.peek()?.push(message);
                continue;
            }
            const logLine = _logs__WEBPACK_IMPORTED_MODULE_0__.LogLine.create(time, source, level);
            logLine.push(message);
            this.logLines.push(logLine);
        }
        // Build the HTML view
        this.build();
        // Update based on the default UI options
        this.update();
        // Update stack trace display
        let count = 0;
        for (let line of this.logLines) {
            count += line.exceptions.length;
        }
        this.stackTraceCountTag.innerText = `(${count})`;
    }
    set(key, value) {
        this.options[key] = value;
        this.update();
    }
    build() {
        for (let line of this.logLines) {
            line.build(this.logTag);
        }
    }
    update() {
        for (let line of this.logLines) {
            line.update(this.options);
        }
    }
    peek() {
        const line = this.logLines[this.logLines.length - 1];
        return line === undefined ? null : line;
    }
}
function parsePrefixLine(line) {
    let time = null;
    let source = null;
    let level = null;
    let message = line;
    const timeMatch = /^\[([0-9]+:[0-9]+:[0-9]+)\] /.exec(message);
    if (timeMatch !== null) {
        time = timeMatch[1];
        message = message.substring(timeMatch[0].length);
    }
    const sourceLevelMatch = /^\[([^\/]+)\/(INFO|DEBUG|WARN|ERROR|FATAL)\]: /.exec(message);
    if (sourceLevelMatch !== null) {
        source = sourceLevelMatch[1];
        level = asLevelInfo(sourceLevelMatch[2]);
        message = message.substring(sourceLevelMatch[0].length);
    }
    return {
        time,
        source,
        level,
        message
    };
}
function asLevelInfo(text) {
    if (text === 'DEBUG' || text === 'INFO' || text === 'WARN' || text === 'ERROR') {
        return text;
    }
    else if (text === 'FATAL') {
        return 'ERROR';
    }
    console.log(`Not a LevelInfo: '${text}'`);
    return null;
}


/***/ }),

/***/ "./src/logs.ts":
/*!*********************!*\
  !*** ./src/logs.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "LogException": () => (/* binding */ LogException),
/* harmony export */   "LogLine": () => (/* binding */ LogLine)
/* harmony export */ });
class LogException {
    constructor(type, level) {
        this.type = type;
        this.level = level;
        this.message = [];
        this.trace = [];
        this.cause = null;
    }
    static create(type, level) {
        return new LogException(type, level);
    }
    push(line) {
        const log = {
            text: line,
            tag: createTag(this.level)
        };
        this.message.push(log);
        return log;
    }
    pushTrace(line) {
        const log = {
            text: line,
            tag: createTag(this.level)
        };
        this.trace.push(log);
        return log;
    }
    pushCause(type) {
        const exc = LogException.create(type, this.level);
        this.cause = exc;
        return exc;
    }
    build(tag) {
        for (let line of this.message) {
            tag.appendChild(line.tag);
        }
        for (let line of this.trace) {
            tag.appendChild(line.tag);
        }
        if (this.cause !== null) {
            this.cause.build(tag);
        }
    }
    update(options, is_cause = false) {
        const hide = !options.levelFor(this.level, true);
        let first = true;
        for (let line of this.message) {
            let text = line.text;
            if (first) {
                first = false;
                text = `${is_cause ? 'Caused by: ' : ''}${this.type}: ${text}`;
            }
            line.tag.hidden = hide;
            line.tag.innerHTML = encodeHtml(text);
        }
        for (let line of this.trace) {
            line.tag.hidden = hide || !options.stacktrace;
            line.tag.innerHTML = encodeHtml(line.text);
        }
        if (this.cause !== null) {
            this.cause.update(options, true);
        }
    }
}
class LogLine {
    constructor(time, source, level) {
        this.message = [];
        this.exceptions = [];
        this.time = time;
        this.source = source;
        this.level = level;
    }
    static create(time, source, level) {
        return new LogLine(time, source, level);
    }
    push(line) {
        const log = {
            text: line,
            tag: createTag(this.level)
        };
        this.message.push(log);
        return log;
    }
    pushException(type) {
        const exc = LogException.create(type, this.level);
        this.exceptions.push(exc);
        return exc;
    }
    build(tag) {
        for (let line of this.message) {
            tag.appendChild(line.tag);
        }
        for (let exc of this.exceptions) {
            exc.build(tag);
        }
    }
    update(options) {
        const hide = !options.levelFor(this.level, true);
        let first = true;
        for (let line of this.message) {
            let text = line.text;
            if (first) {
                first = false;
                text = this.updatePrefix(text, options);
            }
            line.tag.hidden = hide;
            line.tag.innerHTML = encodeHtml(text);
        }
        for (let exc of this.exceptions) {
            exc.update(options);
        }
    }
    updatePrefix(text, options) {
        if (options.source && options.level) {
            text = `[${this.source} / ${this.level}] ${text}`;
        }
        else if (options.source) {
            text = `[${this.source}] ${text}`;
        }
        else if (options.level) {
            text = `[${this.level}] ${text}`;
        }
        if (options.timestamps) {
            text = `[${this.time}] ${text}`;
        }
        return text;
    }
}
function createTag(level) {
    const tag = document.createElement('p');
    if (level !== null) {
        tag.classList.add(`log-${level.toLowerCase()}`);
    }
    return tag;
}
const HTML_ESCAPE_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};
function encodeHtml(text) {
    // if (text.includes('§')) {
    //    text = text.replace(/[\&<>"'`=\/]/g, s => HTML_ESCAPE_ENTITIES[s] as string);
    //}
    //text = text.replace(/[\&<>"'`=\/]/g, s => HTML_ESCAPE_ENTITIES[s] as string);
    return text.replaceAll('\t', '    ').replaceAll(' ', '&nbsp;');
}


/***/ }),

/***/ "./src/options.ts":
/*!************************!*\
  !*** ./src/options.ts ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Options": () => (/* binding */ Options)
/* harmony export */ });
class Options {
    constructor() {
        this.timestamps = false;
        this.source = true;
        this.level = false;
        this.debug = true;
        this.info = true;
        this.warn = true;
        this.error = true;
        this.stacktrace = true;
    }
    static create() {
        return new Options();
    }
    levelFor(level, def) {
        switch (level) {
            case 'DEBUG': return this.debug;
            case 'INFO': return this.info;
            case 'WARN': return this.warn;
            case 'ERROR': return this.error;
        }
        return def;
    }
}


/***/ }),

/***/ "./src/utils.ts":
/*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getElementById": () => (/* binding */ getElementById),
/* harmony export */   "hasProperty": () => (/* binding */ hasProperty),
/* harmony export */   "requireNotNull": () => (/* binding */ requireNotNull),
/* harmony export */   "requireType": () => (/* binding */ requireType)
/* harmony export */ });
function getElementById(id, type) {
    const tag = document.getElementById(id);
    if (tag !== null && tag instanceof type) {
        return tag;
    }
    throw new TypeError(`No HTMLElement with id=${id} of type=${type} found, got ${tag}.`);
}
function hasProperty(obj, prop) {
    return obj.hasOwnProperty(prop);
}
function requireNotNull(t) {
    if (t === null) {
        throw new TypeError('Null');
    }
    return t;
}
function requireType(t, type) {
    requireNotNull(t);
    if (t instanceof type) {
        return t;
    }
    throw new TypeError('');
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils */ "./src/utils.ts");
/* harmony import */ var _engine__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./engine */ "./src/engine.ts");


window.addEventListener('load', () => {
    window.engine = new _engine__WEBPACK_IMPORTED_MODULE_1__.Engine();
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getElementById)('upload-file', HTMLInputElement).addEventListener('change', event => {
        if (event.target !== null) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = fileEvent => {
                _engine__WEBPACK_IMPORTED_MODULE_1__.Engine.instance().load(fileEvent.target?.result);
            };
            reader.readAsText(file);
        }
    });
    setupCheckbox('timestamps');
    setupCheckbox('source');
    setupCheckbox('level');
    setupCheckbox('debug');
    setupCheckbox('info');
    setupCheckbox('warn');
    setupCheckbox('error');
    setupCheckbox('stacktrace');
});
function setupCheckbox(key) {
    const checkbox = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getElementById)(`checkbox-${key}`, HTMLInputElement);
    checkbox.addEventListener('change', () => {
        _engine__WEBPACK_IMPORTED_MODULE_1__.Engine.instance().set(key, checkbox.checked);
    });
}

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFLLENBQUMsTUFBYyxDQUFDLEtBQWdCLENBQUMsQ0FBQyxDQUFTLENBQUM7WUFDdEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUVoQyxNQUFNLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxFQUFFO2dCQUN4QixvREFBZSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBZ0IsQ0FBQyxDQUFDO1lBQy9ELENBQUMsQ0FBQztZQUNGLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1QixhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDeEIsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXZCLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QixhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUV2QixhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLGFBQWEsQ0FBQyxHQUFZO0lBQy9CLE1BQU0sUUFBUSxHQUFHLHNEQUFjLENBQUMsWUFBWSxHQUFHLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLG9EQUFlLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9wcm9qZWN0LWluc2lnaHQvLi9zcmMvZW5naW5lLnRzIiwid2VicGFjazovL3Byb2plY3QtaW5zaWdodC8uL3NyYy9sb2dzLnRzIiwid2VicGFjazovL3Byb2plY3QtaW5zaWdodC8uL3NyYy9vcHRpb25zLnRzIiwid2VicGFjazovL3Byb2plY3QtaW5zaWdodC8uL3NyYy91dGlscy50cyIsIndlYnBhY2s6Ly9wcm9qZWN0LWluc2lnaHQvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vcHJvamVjdC1pbnNpZ2h0L3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9wcm9qZWN0LWluc2lnaHQvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9wcm9qZWN0LWluc2lnaHQvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9wcm9qZWN0LWluc2lnaHQvLi9zcmMvbWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dFeGNlcHRpb24sIExvZ0xpbmUgfSBmcm9tIFwiLi9sb2dzXCI7XG5pbXBvcnQgeyBJT3B0aW9uLCBJT3B0aW9ucywgT3B0aW9ucyB9IGZyb20gXCIuL29wdGlvbnNcIjtcbmltcG9ydCB7IGdldEVsZW1lbnRCeUlkLCByZXF1aXJlVHlwZSB9IGZyb20gXCIuL3V0aWxzXCI7XG5cblxuZXhwb3J0IGNsYXNzIEVuZ2luZSB7XG5cbiAgICBwdWJsaWMgc3RhdGljIGluc3RhbmNlKCk6IEVuZ2luZSB7XG4gICAgICAgIHJldHVybiByZXF1aXJlVHlwZSgod2luZG93IGFzIGFueSkuZW5naW5lLCBFbmdpbmUpO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9nVGFnOiBIVE1MRGl2RWxlbWVudDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvZ0xpbmVzOiBMb2dMaW5lW107XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IHN0YWNrVHJhY2VDb3VudFRhZzogSFRNTFNwYW5FbGVtZW50O1xuICAgIFxuICAgIHByaXZhdGUgb3B0aW9uczogSU9wdGlvbnM7XG5cbiAgICBwdWJsaWMgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubG9nVGFnID0gZ2V0RWxlbWVudEJ5SWQoJ2xvZycsIEhUTUxEaXZFbGVtZW50KTtcblxuICAgICAgICB0aGlzLnN0YWNrVHJhY2VDb3VudFRhZyA9IGdldEVsZW1lbnRCeUlkKCdzdGFjay10cmFjZS1jb3VudCcsIEhUTUxTcGFuRWxlbWVudCk7XG5cbiAgICAgICAgdGhpcy5sb2dMaW5lcyA9IFtdO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBPcHRpb25zLmNyZWF0ZSgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBsb2FkKHRleHQ6IHN0cmluZykge1xuXG4gICAgICAgIC8vIFBhcnNlIGxvZyBsaW5lc1xuICAgICAgICBsZXQgbGluZXM6IHN0cmluZ1tdID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBsaW5lOiBzdHJpbmcgPSBsaW5lc1tpXSBhcyBzdHJpbmc7XG4gICAgICAgICAgICBsZXQge3RpbWUsIHNvdXJjZSwgbGV2ZWwsIG1lc3NhZ2V9OiBQcmVmaXhQYXJzZVJlc3VsdCA9IHBhcnNlUHJlZml4TGluZShsaW5lKTtcblxuICAgICAgICAgICAgLy8gSW5zcGVjdCBpZiB0aGlzIGlzIHRoZSBmaXJzdCBsaW5lIG9mIGEgc3RhY2sgdHJhY2VcbiAgICAgICAgICAgIGNvbnN0IGV4Y2VwdGlvbk1hdGNoID0gL14oW0EtWmEtejAtOVxcLl0rKTogLy5leGVjKGxpbmUpO1xuICAgICAgICAgICAgaWYgKGV4Y2VwdGlvbk1hdGNoICE9PSBudWxsKSB7XG5cbiAgICAgICAgICAgICAgICBsZXQgcHJldjogTG9nTGluZSB8IG51bGwgPSB0aGlzLnBlZWsoKTtcbiAgICAgICAgICAgICAgICBpZiAocHJldiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBleGNlcHRpb25UeXBlOiBzdHJpbmcgPSBleGNlcHRpb25NYXRjaFsxXSBhcyBzdHJpbmc7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhjZXB0aW9uTWVzc2FnZTogc3RyaW5nID0gbWVzc2FnZS5zdWJzdHJpbmcoKGV4Y2VwdGlvbk1hdGNoWzBdIGFzIHN0cmluZykubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGV4Y2VwdGlvbjogTG9nRXhjZXB0aW9uID0gcHJldi5wdXNoRXhjZXB0aW9uKGV4Y2VwdGlvblR5cGUpO1xuICAgICAgICAgICAgICAgIGxldCBsYXRlc3RFeGNlcHRpb246IExvZ0V4Y2VwdGlvbiA9IGV4Y2VwdGlvbjtcblxuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbi5wdXNoKGV4Y2VwdGlvbk1lc3NhZ2UpXG5cbiAgICAgICAgICAgICAgICAvLyBDYXB0dXJlIHN0YWNrIHRyYWNlKHMpXG4gICAgICAgICAgICAgICAgZm9yIChpKys7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YWNrVHJhY2VMaW5lID0gbGluZXNbaV0gYXMgc3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoL15bIFxcdF0rYXQgLy50ZXN0KHN0YWNrVHJhY2VMaW5lKSB8fCAvXlsgXFx0XStcXC5cXC5cXC4gWzAtOV0rIG1vcmUvLnRlc3Qoc3RhY2tUcmFjZUxpbmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRlc3RFeGNlcHRpb24ucHVzaFRyYWNlKHN0YWNrVHJhY2VMaW5lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2F1c2VNYXRjaCA9IC9eQ2F1c2VkIGJ5OiAoW0EtWmEtejAtOVxcLl0rKTogLy5leGVjKHN0YWNrVHJhY2VMaW5lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhdXNlTWF0Y2ggIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhdXNlVHlwZTogc3RyaW5nID0gY2F1c2VNYXRjaFsxXSBhcyBzdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXVzZU1lc3NhZ2U6IHN0cmluZyA9IHN0YWNrVHJhY2VMaW5lLnN1YnN0cmluZygoY2F1c2VNYXRjaFswXSBhcyBzdHJpbmcpLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdGVzdEV4Y2VwdGlvbiA9IGxhdGVzdEV4Y2VwdGlvbi5wdXNoQ2F1c2UoY2F1c2VUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdGVzdEV4Y2VwdGlvbi5wdXNoKGNhdXNlTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxldCBmdXR1cmVQcmVmaXg6IFByZWZpeFBhcnNlUmVzdWx0ID0gcGFyc2VQcmVmaXhMaW5lKHN0YWNrVHJhY2VMaW5lKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZnV0dXJlUHJlZml4LnRpbWUgPT09IG51bGwgJiYgZnV0dXJlUHJlZml4LmxldmVsID09PSBudWxsICYmIGZ1dHVyZVByZWZpeC5zb3VyY2UgPT09IG51bGwgJiYgbGF0ZXN0RXhjZXB0aW9uLnRyYWNlLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoaXQgYSByZWNvZ25pemVkIGxpbmUsIHRoZW4gd2UgYWJvcnQgcGFyc2luZy5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE90aGVyd2lzZSwgd2UgYWNjdW11bGF0ZSBsaW5lcyBhcyBwYXJ0IG9mIHRoZSBleGNlcHRpb24gbWVzc2FnZSAqaWYqIGl0J3Mgbm90IGFscmVhZHkgcGFydCBvZiB0aGUgc3RhY2sgdHJhY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRlc3RFeGNlcHRpb24ucHVzaChzdGFja1RyYWNlTGluZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIERpZCBub3QgcmVjb2duaXplIHRoaXMgbGluZTsgYWJvcnQgYW5kIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGltZSA9PT0gbnVsbCB8fCBzb3VyY2UgPT09IG51bGwgfHwgbGV2ZWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBlZWsoKT8ucHVzaChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbG9nTGluZSA9IExvZ0xpbmUuY3JlYXRlKHRpbWUsIHNvdXJjZSwgbGV2ZWwpO1xuICAgICAgICAgICAgbG9nTGluZS5wdXNoKG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICB0aGlzLmxvZ0xpbmVzLnB1c2gobG9nTGluZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCB0aGUgSFRNTCB2aWV3XG4gICAgICAgIHRoaXMuYnVpbGQoKTtcblxuICAgICAgICAvLyBVcGRhdGUgYmFzZWQgb24gdGhlIGRlZmF1bHQgVUkgb3B0aW9uc1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFjayB0cmFjZSBkaXNwbGF5XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGZvciAobGV0IGxpbmUgb2YgdGhpcy5sb2dMaW5lcykge1xuICAgICAgICAgICAgY291bnQgKz0gbGluZS5leGNlcHRpb25zLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YWNrVHJhY2VDb3VudFRhZy5pbm5lclRleHQgPSBgKCR7Y291bnR9KWA7XG4gICAgfVxuXG4gICAgcHVibGljIHNldChrZXk6IElPcHRpb24sIHZhbHVlOiBib29sZWFuKTogdm9pZCB7XG4gICAgICAgIHRoaXMub3B0aW9uc1trZXldID0gdmFsdWU7XG4gICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZCgpOiB2b2lkIHtcbiAgICAgICAgZm9yIChsZXQgbGluZSBvZiB0aGlzLmxvZ0xpbmVzKSB7XG4gICAgICAgICAgICBsaW5lLmJ1aWxkKHRoaXMubG9nVGFnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgdXBkYXRlKCk6IHZvaWQge1xuICAgICAgICBmb3IgKGxldCBsaW5lIG9mIHRoaXMubG9nTGluZXMpIHtcbiAgICAgICAgICAgIGxpbmUudXBkYXRlKHRoaXMub3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHBlZWsoKTogTG9nTGluZSB8IG51bGwgeyBcbiAgICAgICAgY29uc3QgbGluZTogTG9nTGluZSB8IHVuZGVmaW5lZCA9IHRoaXMubG9nTGluZXNbdGhpcy5sb2dMaW5lcy5sZW5ndGggLSAxXTtcbiAgICAgICAgcmV0dXJuIGxpbmUgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBsaW5lO1xuICAgIH1cbn1cblxudHlwZSBQcmVmaXhQYXJzZVJlc3VsdCA9IHtcbiAgICB0aW1lOiBzdHJpbmcgfCBudWxsLFxuICAgIHNvdXJjZTogc3RyaW5nIHwgbnVsbCxcbiAgICBsZXZlbDogTGV2ZWxJbmZvIHwgbnVsbCxcbiAgICBtZXNzYWdlOiBzdHJpbmdcbn07XG5cbmZ1bmN0aW9uIHBhcnNlUHJlZml4TGluZShsaW5lOiBzdHJpbmcpOiBQcmVmaXhQYXJzZVJlc3VsdCB7XG4gICAgbGV0IHRpbWU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGxldCBzb3VyY2U6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGxldCBsZXZlbDogTGV2ZWxJbmZvIHwgbnVsbCA9IG51bGw7XG5cbiAgICBsZXQgbWVzc2FnZTogc3RyaW5nID0gbGluZTtcblxuICAgIGNvbnN0IHRpbWVNYXRjaCA9IC9eXFxbKFswLTldKzpbMC05XSs6WzAtOV0rKVxcXSAvLmV4ZWMobWVzc2FnZSk7XG4gICAgaWYgKHRpbWVNYXRjaCAhPT0gbnVsbCkge1xuICAgICAgICB0aW1lID0gdGltZU1hdGNoWzFdIGFzIHN0cmluZztcbiAgICAgICAgbWVzc2FnZSA9IG1lc3NhZ2Uuc3Vic3RyaW5nKCh0aW1lTWF0Y2hbMF0gYXMgc3RyaW5nKS5sZW5ndGgpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZUxldmVsTWF0Y2ggPSAvXlxcWyhbXlxcL10rKVxcLyhJTkZPfERFQlVHfFdBUk58RVJST1J8RkFUQUwpXFxdOiAvLmV4ZWMobWVzc2FnZSk7XG4gICAgaWYgKHNvdXJjZUxldmVsTWF0Y2ggIT09IG51bGwpIHtcbiAgICAgICAgc291cmNlID0gc291cmNlTGV2ZWxNYXRjaFsxXSBhcyBzdHJpbmc7XG4gICAgICAgIGxldmVsID0gYXNMZXZlbEluZm8oc291cmNlTGV2ZWxNYXRjaFsyXSk7XG4gICAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlLnN1YnN0cmluZygoc291cmNlTGV2ZWxNYXRjaFswXSBhcyBzdHJpbmcpLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdGltZSxcbiAgICAgICAgc291cmNlLFxuICAgICAgICBsZXZlbCxcbiAgICAgICAgbWVzc2FnZVxuICAgIH07XG59XG5cblxuZnVuY3Rpb24gYXNMZXZlbEluZm8odGV4dDogYW55KTogTGV2ZWxJbmZvIHwgbnVsbCB7XG4gICAgaWYgKHRleHQgPT09ICdERUJVRycgfHwgdGV4dCA9PT0gJ0lORk8nIHx8IHRleHQgPT09ICdXQVJOJyB8fCB0ZXh0ID09PSAnRVJST1InKSB7XG4gICAgICAgIHJldHVybiB0ZXh0O1xuICAgIH0gZWxzZSBpZiAodGV4dCA9PT0gJ0ZBVEFMJykge1xuICAgICAgICByZXR1cm4gJ0VSUk9SJztcbiAgICB9XG4gICAgY29uc29sZS5sb2coYE5vdCBhIExldmVsSW5mbzogJyR7dGV4dH0nYCk7XG4gICAgcmV0dXJuIG51bGw7XG59XG4iLCJpbXBvcnQgeyBJT3B0aW9ucyB9IGZyb20gXCIuL29wdGlvbnNcIjtcblxuXG5leHBvcnQgaW50ZXJmYWNlIElMaW5lIHtcbiAgICByZWFkb25seSB0ZXh0OiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgdGFnOiBIVE1MUGFyYWdyYXBoRWxlbWVudDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJRXhjZXB0aW9uIHtcbiAgICByZWFkb25seSB0eXBlOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgbWVzc2FnZTogSUxpbmVbXTtcblxuICAgIHJlYWRvbmx5IHRyYWNlOiBJTGluZVtdO1xuXG4gICAgY2F1c2U6IElFeGNlcHRpb24gfCBudWxsO1xufVxuXG5leHBvcnQgY2xhc3MgTG9nRXhjZXB0aW9uIHtcblxuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlKHR5cGU6IHN0cmluZywgbGV2ZWw6IExldmVsSW5mbyk6IExvZ0V4Y2VwdGlvbiB7XG4gICAgICAgIHJldHVybiBuZXcgTG9nRXhjZXB0aW9uKHR5cGUsIGxldmVsKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVhZG9ubHkgdHlwZTogc3RyaW5nO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWw6IExldmVsSW5mbztcbiAgICBcbiAgICBwdWJsaWMgcmVhZG9ubHkgbWVzc2FnZTogSUxpbmVbXTtcbiAgICBwdWJsaWMgcmVhZG9ubHkgdHJhY2U6IElMaW5lW107XG5cbiAgICBwdWJsaWMgY2F1c2U6IExvZ0V4Y2VwdGlvbiB8IG51bGw7XG5cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZywgbGV2ZWw6IExldmVsSW5mbykge1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLmxldmVsID0gbGV2ZWw7XG4gICAgICAgIFxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBbXTtcbiAgICAgICAgdGhpcy50cmFjZSA9IFtdO1xuXG4gICAgICAgIHRoaXMuY2F1c2UgPSBudWxsO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXNoKGxpbmU6IHN0cmluZyk6IElMaW5lIHtcbiAgICAgICAgY29uc3QgbG9nOiBJTGluZSA9IHtcbiAgICAgICAgICAgIHRleHQ6IGxpbmUsXG4gICAgICAgICAgICB0YWc6IGNyZWF0ZVRhZyh0aGlzLmxldmVsKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLm1lc3NhZ2UucHVzaChsb2cpO1xuICAgICAgICByZXR1cm4gbG9nO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXNoVHJhY2UobGluZTogc3RyaW5nKTogSUxpbmUge1xuICAgICAgICBjb25zdCBsb2c6IElMaW5lID0ge1xuICAgICAgICAgICAgdGV4dDogbGluZSxcbiAgICAgICAgICAgIHRhZzogY3JlYXRlVGFnKHRoaXMubGV2ZWwpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMudHJhY2UucHVzaChsb2cpO1xuICAgICAgICByZXR1cm4gbG9nO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXNoQ2F1c2UodHlwZTogc3RyaW5nKTogTG9nRXhjZXB0aW9uIHtcbiAgICAgICAgY29uc3QgZXhjOiBMb2dFeGNlcHRpb24gPSBMb2dFeGNlcHRpb24uY3JlYXRlKHR5cGUsIHRoaXMubGV2ZWwpO1xuICAgICAgICB0aGlzLmNhdXNlID0gZXhjO1xuICAgICAgICByZXR1cm4gZXhjO1xuICAgIH1cblxuICAgIHB1YmxpYyBidWlsZCh0YWc6IEhUTUxEaXZFbGVtZW50KTogdm9pZCB7XG4gICAgICAgIGZvciAobGV0IGxpbmUgb2YgdGhpcy5tZXNzYWdlKSB7XG4gICAgICAgICAgICB0YWcuYXBwZW5kQ2hpbGQobGluZS50YWcpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGxpbmUgb2YgdGhpcy50cmFjZSkge1xuICAgICAgICAgICAgdGFnLmFwcGVuZENoaWxkKGxpbmUudGFnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jYXVzZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5jYXVzZS5idWlsZCh0YWcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZShvcHRpb25zOiBJT3B0aW9ucywgaXNfY2F1c2U6IGJvb2xlYW4gPSBmYWxzZSk6IHZvaWQge1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaGlkZTogYm9vbGVhbiA9ICFvcHRpb25zLmxldmVsRm9yKHRoaXMubGV2ZWwsIHRydWUpO1xuXG4gICAgICAgIGxldCBmaXJzdDogYm9vbGVhbiA9IHRydWU7XG4gICAgICAgIGZvciAobGV0IGxpbmUgb2YgdGhpcy5tZXNzYWdlKSB7XG4gICAgICAgICAgICBsZXQgdGV4dDogc3RyaW5nID0gbGluZS50ZXh0O1xuICAgICAgICAgICAgaWYgKGZpcnN0KSB7XG4gICAgICAgICAgICAgICAgZmlyc3QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0ZXh0ID0gYCR7aXNfY2F1c2UgPyAnQ2F1c2VkIGJ5OiAnIDogJyd9JHt0aGlzLnR5cGV9OiAke3RleHR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpbmUudGFnLmhpZGRlbiA9IGhpZGU7XG4gICAgICAgICAgICBsaW5lLnRhZy5pbm5lckhUTUwgPSBlbmNvZGVIdG1sKHRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgbGluZSBvZiB0aGlzLnRyYWNlKSB7XG4gICAgICAgICAgICBsaW5lLnRhZy5oaWRkZW4gPSBoaWRlIHx8ICFvcHRpb25zLnN0YWNrdHJhY2U7XG4gICAgICAgICAgICBsaW5lLnRhZy5pbm5lckhUTUwgPSBlbmNvZGVIdG1sKGxpbmUudGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jYXVzZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5jYXVzZS51cGRhdGUob3B0aW9ucywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIExvZ0xpbmUge1xuXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGUodGltZTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZywgbGV2ZWw6IExldmVsSW5mbyk6IExvZ0xpbmUge1xuICAgICAgICByZXR1cm4gbmV3IExvZ0xpbmUodGltZSwgc291cmNlLCBsZXZlbCk7XG4gICAgfVxuXG5cbiAgICBwdWJsaWMgcmVhZG9ubHkgbWVzc2FnZTogSUxpbmVbXTtcbiAgICBwdWJsaWMgcmVhZG9ubHkgZXhjZXB0aW9uczogTG9nRXhjZXB0aW9uW107XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IHRpbWU6IHN0cmluZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZTogc3RyaW5nO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgbGV2ZWw6IExldmVsSW5mbztcblxuICAgIHByaXZhdGUgY29uc3RydWN0b3IodGltZTogc3RyaW5nLCBzb3VyY2U6IHN0cmluZywgbGV2ZWw6IExldmVsSW5mbykge1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBbXTtcbiAgICAgICAgdGhpcy5leGNlcHRpb25zID0gW107XG5cbiAgICAgICAgdGhpcy50aW1lID0gdGltZTtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIHRoaXMubGV2ZWwgPSBsZXZlbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHVzaChsaW5lOiBzdHJpbmcpOiBJTGluZSB7XG4gICAgICAgIGNvbnN0IGxvZzogSUxpbmUgPSB7XG4gICAgICAgICAgICB0ZXh0OiBsaW5lLFxuICAgICAgICAgICAgdGFnOiBjcmVhdGVUYWcodGhpcy5sZXZlbClcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5tZXNzYWdlLnB1c2gobG9nKTtcbiAgICAgICAgcmV0dXJuIGxvZztcbiAgICB9XG5cbiAgICBwdWJsaWMgcHVzaEV4Y2VwdGlvbih0eXBlOiBzdHJpbmcpOiBMb2dFeGNlcHRpb24ge1xuICAgICAgICBjb25zdCBleGM6IExvZ0V4Y2VwdGlvbiA9IExvZ0V4Y2VwdGlvbi5jcmVhdGUodHlwZSwgdGhpcy5sZXZlbCk7XG4gICAgICAgIHRoaXMuZXhjZXB0aW9ucy5wdXNoKGV4Yyk7XG4gICAgICAgIHJldHVybiBleGM7XG4gICAgfVxuXG4gICAgcHVibGljIGJ1aWxkKHRhZzogSFRNTERpdkVsZW1lbnQpOiB2b2lkIHtcbiAgICAgICAgZm9yIChsZXQgbGluZSBvZiB0aGlzLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHRhZy5hcHBlbmRDaGlsZChsaW5lLnRhZyk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgZXhjIG9mIHRoaXMuZXhjZXB0aW9ucykge1xuICAgICAgICAgICAgZXhjLmJ1aWxkKHRhZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlKG9wdGlvbnM6IElPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGhpZGU6IGJvb2xlYW4gPSAhb3B0aW9ucy5sZXZlbEZvcih0aGlzLmxldmVsLCB0cnVlKTtcblxuICAgICAgICBsZXQgZmlyc3QgPSB0cnVlO1xuICAgICAgICBmb3IgKGxldCBsaW5lIG9mIHRoaXMubWVzc2FnZSkge1xuICAgICAgICAgICAgbGV0IHRleHQgPSBsaW5lLnRleHQ7XG4gICAgICAgICAgICBpZiAoZmlyc3QpIHtcbiAgICAgICAgICAgICAgICBmaXJzdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRleHQgPSB0aGlzLnVwZGF0ZVByZWZpeCh0ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGluZS50YWcuaGlkZGVuID0gaGlkZTtcbiAgICAgICAgICAgIGxpbmUudGFnLmlubmVySFRNTCA9IGVuY29kZUh0bWwodGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBleGMgb2YgdGhpcy5leGNlcHRpb25zKSB7XG4gICAgICAgICAgICBleGMudXBkYXRlKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1cGRhdGVQcmVmaXgodGV4dDogc3RyaW5nLCBvcHRpb25zOiBJT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgICAgIGlmIChvcHRpb25zLnNvdXJjZSAmJiBvcHRpb25zLmxldmVsKSB7XG4gICAgICAgICAgICB0ZXh0ID0gYFske3RoaXMuc291cmNlfSAvICR7dGhpcy5sZXZlbH1dICR7dGV4dH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuc291cmNlKSB7XG4gICAgICAgICAgICB0ZXh0ID0gYFske3RoaXMuc291cmNlfV0gJHt0ZXh0fWA7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5sZXZlbCkge1xuICAgICAgICAgICAgdGV4dCA9IGBbJHt0aGlzLmxldmVsfV0gJHt0ZXh0fWA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy50aW1lc3RhbXBzKSB7XG4gICAgICAgICAgICB0ZXh0ID0gYFske3RoaXMudGltZX1dICR7dGV4dH1gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVUYWcobGV2ZWw6IExldmVsSW5mbyB8IG51bGwpOiBIVE1MUGFyYWdyYXBoRWxlbWVudCB7XG4gICAgY29uc3QgdGFnOiBIVE1MUGFyYWdyYXBoRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgICBpZiAobGV2ZWwgIT09IG51bGwpIHtcbiAgICAgICAgdGFnLmNsYXNzTGlzdC5hZGQoYGxvZy0ke2xldmVsLnRvTG93ZXJDYXNlKCl9YCk7XG4gICAgfVxuICAgIHJldHVybiB0YWc7XG59XG5cbmNvbnN0IEhUTUxfRVNDQVBFX0VOVElUSUVTOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHtcbiAgICAnJic6ICcmYW1wOycsXG4gICAgJzwnOiAnJmx0OycsXG4gICAgJz4nOiAnJmd0OycsXG4gICAgJ1wiJzogJyZxdW90OycsXG4gICAgXCInXCI6ICcmIzM5OycsXG4gICAgJy8nOiAnJiN4MkY7JyxcbiAgICAnYCc6ICcmI3g2MDsnLFxuICAgICc9JzogJyYjeDNEOydcbn07XG5cblxuZnVuY3Rpb24gZW5jb2RlSHRtbCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIGlmICh0ZXh0LmluY2x1ZGVzKCfCpycpKSB7XG4gICAgLy8gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvW1xcJjw+XCInYD1cXC9dL2csIHMgPT4gSFRNTF9FU0NBUEVfRU5USVRJRVNbc10gYXMgc3RyaW5nKTtcbiAgICAvL31cbiAgICAvL3RleHQgPSB0ZXh0LnJlcGxhY2UoL1tcXCY8PlwiJ2A9XFwvXS9nLCBzID0+IEhUTUxfRVNDQVBFX0VOVElUSUVTW3NdIGFzIHN0cmluZyk7XG4gICAgcmV0dXJuIHRleHQucmVwbGFjZUFsbCgnXFx0JywgJyAgICAnKS5yZXBsYWNlQWxsKCcgJywgJyZuYnNwOycpO1xufSIsIlxuXG5leHBvcnQgaW50ZXJmYWNlIElPcHRpb25zIHtcbiAgICB0aW1lc3RhbXBzOiBib29sZWFuO1xuICAgIHNvdXJjZTogYm9vbGVhbjtcbiAgICBsZXZlbDogYm9vbGVhbjtcbiAgICBcbiAgICBkZWJ1ZzogYm9vbGVhbjtcbiAgICBpbmZvOiBib29sZWFuO1xuICAgIHdhcm46IGJvb2xlYW47XG4gICAgZXJyb3I6IGJvb2xlYW47XG5cbiAgICBsZXZlbEZvcihsZXZlbDogTGV2ZWxJbmZvIHwgbnVsbCwgZGVmOiBib29sZWFuKTogYm9vbGVhbjtcbiAgICBcbiAgICBzdGFja3RyYWNlOiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBJT3B0aW9uID0ga2V5b2YgSU9wdGlvbnMgJiAoJ3RpbWVzdGFtcHMnIHwgJ3NvdXJjZScgfCAnbGV2ZWwnIHwgJ2RlYnVnJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcicgfCAnc3RhY2t0cmFjZScpO1xuXG5cbmV4cG9ydCBjbGFzcyBPcHRpb25zIGltcGxlbWVudHMgSU9wdGlvbnMge1xuXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGUoKTogSU9wdGlvbnMge1xuICAgICAgICByZXR1cm4gbmV3IE9wdGlvbnMoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgdGltZXN0YW1wczogYm9vbGVhbjtcbiAgICBwdWJsaWMgc291cmNlOiBib29sZWFuO1xuICAgIHB1YmxpYyBsZXZlbDogYm9vbGVhbjtcblxuICAgIHB1YmxpYyBkZWJ1ZzogYm9vbGVhbjtcbiAgICBwdWJsaWMgaW5mbzogYm9vbGVhbjtcbiAgICBwdWJsaWMgd2FybjogYm9vbGVhbjtcbiAgICBwdWJsaWMgZXJyb3I6IGJvb2xlYW47XG5cbiAgICBwdWJsaWMgc3RhY2t0cmFjZTogYm9vbGVhbjtcblxuICAgIHByaXZhdGUgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMudGltZXN0YW1wcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHRydWU7XG4gICAgICAgIHRoaXMubGV2ZWwgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmRlYnVnID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pbmZvID0gdHJ1ZTtcbiAgICAgICAgdGhpcy53YXJuID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lcnJvciA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5zdGFja3RyYWNlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgbGV2ZWxGb3IobGV2ZWw6IExldmVsSW5mbyB8IG51bGwsIGRlZjogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlICdERUJVRyc6IHJldHVybiB0aGlzLmRlYnVnO1xuICAgICAgICAgICAgY2FzZSAnSU5GTyc6IHJldHVybiB0aGlzLmluZm87XG4gICAgICAgICAgICBjYXNlICdXQVJOJzogcmV0dXJuIHRoaXMud2FybjtcbiAgICAgICAgICAgIGNhc2UgJ0VSUk9SJzogcmV0dXJuIHRoaXMuZXJyb3I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZjtcbiAgICB9XG59IiwiXG5leHBvcnQgdHlwZSBUeXBlPFQ+ID0gbmV3ICguLi5hcmdzIDogYW55W10pID0+IFQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbGVtZW50QnlJZDxUPihpZDogc3RyaW5nLCB0eXBlOiBUeXBlPFQ+KTogVCB7XG4gICAgY29uc3QgdGFnOiBIVE1MRWxlbWVudCB8IG51bGwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgaWYgKHRhZyAhPT0gbnVsbCAmJiB0YWcgaW5zdGFuY2VvZiB0eXBlKSB7XG4gICAgICAgIHJldHVybiB0YWc7XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE5vIEhUTUxFbGVtZW50IHdpdGggaWQ9JHtpZH0gb2YgdHlwZT0ke3R5cGV9IGZvdW5kLCBnb3QgJHt0YWd9LmApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzUHJvcGVydHk8WCBleHRlbmRzIHt9LCBZIGV4dGVuZHMgUHJvcGVydHlLZXk+KG9iajogWCwgcHJvcDogWSk6IG9iaiBpcyBYICYgUmVjb3JkPFksIHVua25vd24+IHtcbiAgICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KHByb3ApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZU5vdE51bGw8VD4odDogVCB8IG51bGwpOiBUIHtcbiAgICBpZiAodCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdOdWxsJyk7XG4gICAgfVxuICAgIHJldHVybiB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZVR5cGU8VD4odDogVCB8IG51bGwsIHR5cGU6IFR5cGU8VD4pOiBUIHtcbiAgICByZXF1aXJlTm90TnVsbCh0KTtcbiAgICBpZiAodCBpbnN0YW5jZW9mIHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJycpO1xufSIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiaW1wb3J0IHsgZ2V0RWxlbWVudEJ5SWQgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IEVuZ2luZSB9IGZyb20gJy4vZW5naW5lJztcbmltcG9ydCB7IElPcHRpb24gfSBmcm9tICcuL29wdGlvbnMnO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcblxuICAgICh3aW5kb3cgYXMgYW55KS5lbmdpbmUgPSBuZXcgRW5naW5lKCk7XG5cbiAgICBnZXRFbGVtZW50QnlJZCgndXBsb2FkLWZpbGUnLCBIVE1MSW5wdXRFbGVtZW50KS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBldmVudCA9PiB7XG4gICAgICAgIGlmIChldmVudC50YXJnZXQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGU6IEJsb2IgPSAoKGV2ZW50LnRhcmdldCBhcyBhbnkpLmZpbGVzIGFzIEJsb2JbXSlbMF0gYXMgQmxvYjtcbiAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmaWxlRXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIEVuZ2luZS5pbnN0YW5jZSgpLmxvYWQoZmlsZUV2ZW50LnRhcmdldD8ucmVzdWx0IGFzIHN0cmluZyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHNldHVwQ2hlY2tib3goJ3RpbWVzdGFtcHMnKTtcbiAgICBzZXR1cENoZWNrYm94KCdzb3VyY2UnKTtcbiAgICBzZXR1cENoZWNrYm94KCdsZXZlbCcpO1xuXG4gICAgc2V0dXBDaGVja2JveCgnZGVidWcnKTtcbiAgICBzZXR1cENoZWNrYm94KCdpbmZvJyk7XG4gICAgc2V0dXBDaGVja2JveCgnd2FybicpO1xuICAgIHNldHVwQ2hlY2tib3goJ2Vycm9yJyk7XG5cbiAgICBzZXR1cENoZWNrYm94KCdzdGFja3RyYWNlJyk7XG59KTtcblxuZnVuY3Rpb24gc2V0dXBDaGVja2JveChrZXk6IElPcHRpb24pOiB2b2lkIHtcbiAgICBjb25zdCBjaGVja2JveCA9IGdldEVsZW1lbnRCeUlkKGBjaGVja2JveC0ke2tleX1gLCBIVE1MSW5wdXRFbGVtZW50KTtcbiAgICBjaGVja2JveC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgIEVuZ2luZS5pbnN0YW5jZSgpLnNldChrZXksIGNoZWNrYm94LmNoZWNrZWQpO1xuICAgIH0pO1xufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9