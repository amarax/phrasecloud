(()=>{"use strict";var e,r,t={6736:(e,r,t)=>{const n=t(1529)(t(2533)),a=n.its;function o(e,r,t){let n=[];for(let a=r;a<r+t&&a<e.length();a++)n.push(e.itemAt(a));return n}n.as;var s=null,p=1;self.onmessage=e=>{e.data.responses?s=e.data.responses:e.data.minNgramLength&&(p=e.data.minNgramLength),s&&function(e){const r=[...new Set(e)].map((e=>n.readDoc(e)));self.postMessage({type:"update",content:{responses:r.length}});let t={},s=[];function c(e){return e.map((e=>e.out(a.lemma))).join(" ")}for(let e=6;e>=p;e--)r.forEach(((r,n)=>{r.sentences().each((r=>{let p=r.tokens().filter((e=>"word"==e.out(a.type)&&!e.out(a.stopWordFlag)&&!s[n]?.has(e.index())));for(let r=0;r<=p.length()-e;r++){let a=o(p,r,e),s=c(a);t[s]||(t[s]=[]),t[s].push({responseIndex:n,ngram:a})}}))})),Object.entries(t).forEach((([e,r])=>{r.length<4&&delete t[e]})),Object.values(t).forEach((e=>{e.forEach((({responseIndex:e,ngram:r})=>{void 0===s[e]&&(s[e]=new Set),r.forEach((r=>s[e].add(r.index())))}))}));Object.entries(t).forEach((([e,r])=>{t[e]=r.map((e=>{let r=e.ngram[0].parentDocument().out(),t=n.readDoc(r).tokens(),o=t.itemAt(e.ngram[0].index()),s=t.itemAt(e.ngram[e.ngram.length-1].index()),p=['<span class="match">',"</span>"];1==e.ngram.length?o.markup(p[0],p[1]):(o.markup(p[0],""),s.markup("",p[1]));let c=o.parentDocument().out(a.markedUpText);return{response:r,phrase:c.slice(c.indexOf(p[0])+p[0].length,c.indexOf(p[1])),markup:c}}));let o={};t[e].forEach((e=>{o[e.phrase]||(o[e.phrase]=0),o[e.phrase]++}));let s=Object.entries(o).reduce(((e,r)=>e[1]>r[1]?e:r))[0];t[e]={commonPhrase:s,responses:t[e]}})),self.postMessage({type:"ngrams",content:{ngrams:t}})}(s)}}},n={};function a(e){var r=n[e];if(void 0!==r)return r.exports;var o=n[e]={exports:{}};return t[e](o,o.exports,a),o.exports}a.m=t,a.x=()=>{var e=a.O(void 0,[968],(()=>a(6736)));return a.O(e)},e=[],a.O=(r,t,n,o)=>{if(!t){var s=1/0;for(l=0;l<e.length;l++){for(var[t,n,o]=e[l],p=!0,c=0;c<t.length;c++)(!1&o||s>=o)&&Object.keys(a.O).every((e=>a.O[e](t[c])))?t.splice(c--,1):(p=!1,o<s&&(s=o));if(p){e.splice(l--,1);var i=n();void 0!==i&&(r=i)}}return r}o=o||0;for(var l=e.length;l>0&&e[l-1][2]>o;l--)e[l]=e[l-1];e[l]=[t,n,o]},a.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return a.d(r,{a:r}),r},a.d=(e,r)=>{for(var t in r)a.o(r,t)&&!a.o(e,t)&&Object.defineProperty(e,t,{enumerable:!0,get:r[t]})},a.f={},a.e=e=>Promise.all(Object.keys(a.f).reduce(((r,t)=>(a.f[t](e,r),r)),[])),a.u=e=>e+".phrasecloud.bundle.js",a.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),a.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),(()=>{var e;a.g.importScripts&&(e=a.g.location+"");var r=a.g.document;if(!e&&r&&(r.currentScript&&(e=r.currentScript.src),!e)){var t=r.getElementsByTagName("script");if(t.length)for(var n=t.length-1;n>-1&&!e;)e=t[n--].src}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),a.p=e})(),(()=>{var e={736:1};a.f.i=(r,t)=>{e[r]||importScripts(a.p+a.u(r))};var r=self.webpackChunkphrasecloud=self.webpackChunkphrasecloud||[],t=r.push.bind(r);r.push=r=>{var[n,o,s]=r;for(var p in o)a.o(o,p)&&(a.m[p]=o[p]);for(s&&s(a);n.length;)e[n.pop()]=1;t(r)}})(),r=a.x,a.x=()=>a.e(968).then(r),a.x()})();