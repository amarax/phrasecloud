"use strict";(self.webpackChunkphrasecloud=self.webpackChunkphrasecloud||[]).push([[93],{93:(e,t,n)=>{const r=n(1529)(n(2533)),s=r.its;r.as,self.postMessage({type:"ready",content:"Worker started"}),console.log("Worker started.");const a=['<span class="match">',"</span>"];function o(e,t,n){let r=[];for(let s=t;s<t+n&&s<e.length();s++)r.push(e.itemAt(s));return r}function l(e,t,n){if(t instanceof Array){let r,s=!1;for(let a of t){let{match:t,remain:o}=l(e,a,n);if(!0===t)return{match:t,remain:o};null===t&&(s=null,r=o)}return{match:s,remain:r}}return"PART"==e.out(s.pos)||"PUNCT"==e.out(s.pos)?{match:null,remain:!0}:"*"==t?e.out(s.stopWordFlag)?{match:null,remain:!0}:{match:!0}:null===t?{match:null}:m.includes(t)&&e.out(s.pos)==t||t==e.out()?{match:!0}:"*"==n?{match:!0,remain:!0}:{match:!1}}var c=null,u=1,h=null,i=null;const m=["ADJ","ADP","ADV","AUX","CCONJ","DET","INTJ","NOUN","NUM","PART","PRON","PROPN","PUNCT","SCONJ","SYM","VERB","X"];self.onmessage=e=>{e.data.responses&&(c=e.data.responses),e.data.minNgramLength&&(u=e.data.minNgramLength),void 0!==e.data.include&&(h=""==e.data.include.trim()?null:(h=r.readDoc(e.data.include).tokens().out()).map((e=>e.toLowerCase()))),void 0!==e.data.phraseStructure&&(""==e.data.phraseStructure.trim()?i=null:(m.join("|"),m.join("|"),i=e.data.phraseStructure)),c&&function(e){console.time(`generateNgrams ${u}`);const t=[...new Set(e)];if(e.length>10&&t.length<.2*e.length){let t=function(e){let t={};return e.forEach((e=>{let n=e.trim().toLowerCase();t[n]||(t[n]=0),t[n]++})),t}(e);return self.postMessage({type:"update",content:{categories:Object.keys(t).length}}),self.postMessage({type:"categories",content:{categories:t}}),void console.timeEnd(`generateNgrams ${u}`)}if(null!==i){let e=function(e,t,n){let o=t.split(" ").filter((e=>""!=e.trim()));o=o.map((e=>e.startsWith("[")&&e.endsWith("]")?e.substring(1,e.length-1).split("|").map((e=>e.length>0?e:null)):[e]));let c=e.map((e=>r.readDoc(e.trim())));n&&(c=c.filter((e=>{let t=e.tokens().out();return n.some((e=>t.find((t=>t.toLowerCase().startsWith(e)))))})));let u={};c.forEach(((e,t)=>{let n=e.tokens(),r=[];for(let e=0;e<n.length();e++){let a=n.itemAt(e);for(let n of r){let c=o[n.structureNextIndex],h=n.structureNextIndex>0?o[n.structureNextIndex-1]:null,{match:i,remain:m}=l(a,c,h);if(!0===i||null===i){if(!0===i&&n.key.push(a.out(s.stem)),m||n.structureNextIndex++,void 0===o[n.structureNextIndex]&&n.structureNextIndex==o.length){let s=n.key.join(" ");u[s]||(u[s]=[]),u[s].push({responseIndex:t,match:[n.match[0],e]}),"*"!=(c||h)[0]&&(r=r.filter((e=>e!=n)))}}else!1===i&&(r=r.filter((e=>e!=n)))}let c=o[0],{match:h,remain:i}=l(a,c,null);if(!0===h){let n={match:[e],structureNextIndex:i?0:1,key:[a.out(s.stem)]};if(1==o.length&&1==n.structureNextIndex){let r=n.key.join(" ");u[r]||(u[r]=[]),u[r].push({responseIndex:t,match:[e,e]})}else r.push(n)}}})),Object.entries(u).forEach((([e,t])=>{let n=[];t.forEach((({responseIndex:e,match:r},s)=>{t.forEach((({responseIndex:t,match:a},o)=>{s!=o&&e==t&&r[0]>=a[0]&&r[1]<=a[1]&&n.push(s)}))})),u[e]=t.filter(((e,t)=>!n.includes(t)))})),Object.entries(u).forEach((([e,t])=>{t.length<=1&&delete u[e]})),Object.entries(u).forEach((([e,t])=>{Object.entries(u).forEach((([n,r])=>{e!=n&&n.includes(e)&&(u[e]=t.filter((({responseIndex:e,match:t})=>!r.some((({responseIndex:n,match:r})=>e==n&&t[0]>=r[0]&&t[1]<=r[1])))))}))})),Object.entries(u).forEach((([e,t])=>{t.length<=1&&delete u[e]}));let h={};return Object.entries(u).forEach((([e,t])=>{let n=new Map;t.forEach((({responseIndex:e,match:t})=>{let s=c[e];n.has(s)||n.set(s,r.readDoc(s.out()))})),h[e]={responses:t.map((({responseIndex:e,match:t})=>{let r=c[e],o=n.get(r),l=o.tokens(),u=t,h=l.itemAt(u[0]),i=l.itemAt(u[1]);return u[1]==u[0]?h.markup(a[0],a[1]):(h.markup(a[0],""),i.markup("",a[1])),{response:o.out(),markup:o.out(s.markedUpText)}}))};let o=new RegExp(`${a[0]}([\\s\\S]*?)${a[1]}`,"g"),l={};n.forEach((e=>{let t=e.out(s.markedUpText).match(o);t?t.forEach((e=>{let t=e.substring(a[0].length,e.length-a[1].length);l[t]||(l[t]=0),l[t]++})):console.error("No matches",e.out(s.markedUpText))}));let u=Object.entries(l).sort(((e,t)=>t[1]-e[1]))[0][0];h[e].commonPhrase=u})),h}(t,i,h);return self.postMessage({type:"ngrams",content:{ngrams:e}}),void console.timeEnd(`generateNgrams ${u}`)}let n=t.map((e=>r.readDoc(e.trim())));h&&(n=n.filter((e=>{let t=e.tokens().out();return h.some((e=>t.find((t=>t.toLowerCase().startsWith(e)))))}))),self.postMessage({type:"update",content:{responses:n.length}});let c={},m=[];function p(e){return e.map((e=>e.out(s.stem))).join(" ")}for(let e=6;e>=u;e--){let t={};n.forEach(((n,r)=>{n.sentences().each((n=>{let a=n.tokens().filter((e=>"word"==e.out(s.type)&&!e.out(s.stopWordFlag)&&"PART"!=e.out(s.pos)&&!m[r]?.has(e.index())));for(let n=0;n<=a.length()-e;n++){let s=o(a,n,e),l=p(s);t[l]||(t[l]=[]),t[l].push({responseIndex:r,ngram:s})}}))})),1==e&&h&&Object.entries(t).forEach((([e,n])=>{t[e]=n.filter((({responseIndex:e,ngram:t})=>{let n=t[0].out().toLowerCase();return!h.includes(n)}))})),Object.entries(t).forEach((([e,n])=>{n.length<3&&delete t[e]}));let r=[];Object.values(c).forEach((e=>{e.forEach((({responseIndex:e,ngram:t})=>{r.push({responseIndex:e,indices:t.map((e=>e.index()))})}))})),e>1&&Object.entries(t).forEach((([e,n])=>{let s=[];n.forEach((({responseIndex:e,ngram:t})=>{let n=!1,a=t.map((e=>e.index()));for(let{responseIndex:t,indices:s}of r)if(t===e)for(let e=0;e<=s.length-a.length;e++){let t=!0;for(let n=0;n<a.length;n++)if(a[n]!=s[e+n]){t=!1;break}if(t){n=!0;break}}n&&s.push(t)})),s.forEach((n=>{t[e]=t[e].filter((({ngram:e})=>e!=n))}))})),Object.entries(t).forEach((([e,t])=>{t.length<3||(c[e]||(c[e]=[]),c[e].push(...t))})),2==e&&Object.values(c).forEach((e=>{e.forEach((({responseIndex:e,ngram:t})=>{void 0===m[e]&&(m[e]=new Set),t.forEach((t=>m[e].add(t.index())))}))}))}Object.entries(c).forEach((([e,t])=>{let n=new Map;t.forEach((e=>{let t=e.ngram[0].parentDocument();n.has(t)||n.set(t,r.readDoc(t.out()))})),c[e]=t.map((e=>{let t=e.ngram[0].parentDocument(),r=n.get(t).tokens(),s=r.itemAt(e.ngram[0].index()),o=r.itemAt(e.ngram[e.ngram.length-1].index());1==e.ngram.length?s.markup(a[0],a[1]):(s.markup(a[0],""),o.markup("",a[1]))}));let o=new RegExp(`${a[0]}(.*?)${a[1]}`,"g"),l={};n.forEach((e=>{let t=e.out(s.markedUpText).match(o);t&&t.forEach((e=>{let t=e.substring(a[0].length,e.length-a[1].length);l[t]||(l[t]=0),l[t]++}))}));let u=Object.entries(l).sort(((e,t)=>t[1]-e[1]))[0][0];c[e]={commonPhrase:u,responses:[...n.values()].map((e=>({response:e.out(),markup:e.out(s.markedUpText)})))}})),console.timeEnd(`generateNgrams ${u}`),self.postMessage({type:"ngrams",content:{ngrams:c}})}(c)}}}]);