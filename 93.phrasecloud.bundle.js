(()=>{"use strict";var e,t,r={93:(e,t,r)=>{const n=r(1529)(r(2533)),o=n.its;function s(e,t,r){let n=[];for(let o=t;o<t+r&&o<e.length();o++)n.push(e.itemAt(o));return n}n.as,console.log("Worker started.");var a=null,l=1;self.onmessage=e=>{e.data.responses&&(a=e.data.responses),e.data.minNgramLength&&(l=e.data.minNgramLength),a&&function(e){console.time(`generateNgrams ${l}`);const t=[...new Set(e)],r=t.map((e=>n.readDoc(e)));if(e.length>10&&t.length<.2*e.length){let t={};return e.forEach((e=>{let r=e.trim().toLowerCase();t[r]||(t[r]=0),t[r]++})),self.postMessage({type:"update",content:{categories:Object.keys(t).length}}),self.postMessage({type:"categories",content:{categories:t}}),void console.timeEnd(`generateNgrams ${l}`)}self.postMessage({type:"update",content:{responses:r.length}});let a={},c=[];function i(e){return e.map((e=>e.out(o.stem))).join(" ")}for(let e=6;e>=l;e--){let t={};r.forEach(((r,n)=>{r.sentences().each((r=>{let a=r.tokens().filter((e=>"word"==e.out(o.type)&&!e.out(o.stopWordFlag)&&"PART"!=e.out(o.pos)&&!c[n]?.has(e.index())));for(let r=0;r<=a.length()-e;r++){let o=s(a,r,e),l=i(o);t[l]||(t[l]=[]),t[l].push({responseIndex:n,ngram:o})}}))})),Object.entries(t).forEach((([e,r])=>{r.length<3&&delete t[e]}));let n=[];Object.values(a).forEach((e=>{e.forEach((({responseIndex:e,ngram:t})=>{n.push({responseIndex:e,indices:t.map((e=>e.index()))})}))})),e>1&&Object.entries(t).forEach((([e,r])=>{let o=[];r.forEach((({responseIndex:e,ngram:t})=>{let r=!1,s=t.map((e=>e.index()));for(let{responseIndex:t,indices:o}of n)if(t===e)for(let e=0;e<=o.length-s.length;e++){let t=!0;for(let r=0;r<s.length;r++)if(s[r]!=o[e+r]){t=!1;break}if(t){r=!0;break}}r&&o.push(t)})),o.forEach((r=>{t[e]=t[e].filter((({ngram:e})=>e!=r))}))})),Object.entries(t).forEach((([e,t])=>{t.length<3||(a[e]||(a[e]=[]),a[e].push(...t))})),2==e&&Object.values(a).forEach((e=>{e.forEach((({responseIndex:e,ngram:t})=>{void 0===c[e]&&(c[e]=new Set),t.forEach((t=>c[e].add(t.index())))}))}))}const p=['<span class="match">',"</span>"];Object.entries(a).forEach((([e,t])=>{let r=new Map;t.forEach((e=>{let t=e.ngram[0].parentDocument();r.has(t)||r.set(t,n.readDoc(t.out()))})),a[e]=t.map((e=>{let t=e.ngram[0].parentDocument(),n=r.get(t).tokens(),o=n.itemAt(e.ngram[0].index()),s=n.itemAt(e.ngram[e.ngram.length-1].index());1==e.ngram.length?o.markup(p[0],p[1]):(o.markup(p[0],""),s.markup("",p[1]))}));let s=new RegExp(`${p[0]}(.*?)${p[1]}`,"g"),l={};r.forEach((e=>{let t=e.out(o.markedUpText).match(s);t&&t.forEach((e=>{let t=e.substring(p[0].length,e.length-p[1].length);l[t]||(l[t]=0),l[t]++}))}));let c=Object.entries(l).sort(((e,t)=>t[1]-e[1]))[0][0];a[e]={commonPhrase:c,responses:[...r.values()].map((e=>({response:e.out(),markup:e.out(o.markedUpText)})))}})),console.timeEnd(`generateNgrams ${l}`),self.postMessage({type:"ngrams",content:{ngrams:a}})}(a)}}},n={};function o(e){var t=n[e];if(void 0!==t)return t.exports;var s=n[e]={exports:{}};return r[e](s,s.exports,o),s.exports}o.m=r,o.x=()=>{var e=o.O(void 0,[968],(()=>o(93)));return o.O(e)},e=[],o.O=(t,r,n,s)=>{if(!r){var a=1/0;for(p=0;p<e.length;p++){for(var[r,n,s]=e[p],l=!0,c=0;c<r.length;c++)(!1&s||a>=s)&&Object.keys(o.O).every((e=>o.O[e](r[c])))?r.splice(c--,1):(l=!1,s<a&&(a=s));if(l){e.splice(p--,1);var i=n();void 0!==i&&(t=i)}}return t}s=s||0;for(var p=e.length;p>0&&e[p-1][2]>s;p--)e[p]=e[p-1];e[p]=[r,n,s]},o.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return o.d(t,{a:t}),t},o.d=(e,t)=>{for(var r in t)o.o(t,r)&&!o.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},o.f={},o.e=e=>Promise.all(Object.keys(o.f).reduce(((t,r)=>(o.f[r](e,t),t)),[])),o.u=e=>e+".phrasecloud.bundle.js",o.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),o.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{var e;o.g.importScripts&&(e=o.g.location+"");var t=o.g.document;if(!e&&t&&(t.currentScript&&(e=t.currentScript.src),!e)){var r=t.getElementsByTagName("script");if(r.length)for(var n=r.length-1;n>-1&&!e;)e=r[n--].src}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),o.p=e})(),(()=>{var e={93:1};o.f.i=(t,r)=>{e[t]||importScripts(o.p+o.u(t))};var t=self.webpackChunkphrasecloud=self.webpackChunkphrasecloud||[],r=t.push.bind(t);t.push=t=>{var[n,s,a]=t;for(var l in s)o.o(s,l)&&(o.m[l]=s[l]);for(a&&a(o);n.length;)e[n.pop()]=1;r(t)}})(),t=o.x,o.x=()=>o.e(968).then(t),o.x()})();