import * as wink from 'wink-nlp';
import * as model from 'wink-eng-lite-web-model';



const nlp = wink( model );
const its = nlp.its;
const as = nlp.as;


console.log('Worker started.');

/**
 * Response object
 * @typedef {Object} Response
 * @property {string} response - The response text
 * @property {string} phrase - The phrase that was matched
 * @property {string} markup - The response text with the matched phrase marked up
 */

/**
 * N-gram object
 * @typedef {Object} ngram
 * @property {string} commonPhrase - The most common phrase in the ngram
 * @property {Response[]} responses - The responses that contain the ngram
 * 
 */

/**
 * N-gram message return object
 * @typedef {Object.<string, ngram>} ngrams - The ngrams using their its.lemma form as the key
 */


function slice(tokenCollection, start, length) {
    let tokens = [];
    for(let i = start; (i < start + length) && (i < tokenCollection.length()); i++) {
        tokens.push(tokenCollection.itemAt(i));
    }
    return tokens;
}


function generateNgrams(data) {
    // Remove repeated responses
    const responses = [...new Set(data)].map(r=>nlp.readDoc(r));

    self.postMessage({type:'update', content:{responses:responses.length}});

    // For each response, extract tokens for each ngram
    let ngrams = {};
    let usedIndices = [];

    function key(ngram) {
        return ngram.map(t=>t.out(its.lemma)).join(' ');
    }

    for(let ngramLength = 6; ngramLength >= minNgramLength; ngramLength--) {
        responses.forEach((response, responseIndex) => {
            response.sentences().each( sentence => {
                let s = sentence.tokens().filter(
                    t=>t.out(its.type) == 'word' 
                    && !t.out(its.stopWordFlag)
                    && !usedIndices[responseIndex]?.has(t.index())
                );

                for(let i = 0; i <= s.length() - ngramLength; i++) {
                    let ngram = slice(s, i, ngramLength);
                    let k = key(ngram);

                    if(!ngrams[k]) {
                        ngrams[k] = [];
                    }
                    ngrams[k].push({responseIndex, ngram});
                }
            })
        });

        // Remove ngrams that do not repeat
        Object.entries(ngrams).forEach(([k,v])=>{
            if(v.length < 3) {
                delete ngrams[k];
            }
        });

        // Mark indices of remaining ngrams as used
        Object.values(ngrams).forEach(entry=>{
            entry.forEach(({responseIndex, ngram})=>{
                if(usedIndices[responseIndex] === undefined) {
                    usedIndices[responseIndex] = new Set();
                }

                ngram.forEach(t=>usedIndices[responseIndex].add(t.index()));
            });
        });
    }

    // For each ngram, get the original text that's bounded by the first and last token
    Object.entries(ngrams).forEach(([k,v])=>{
        ngrams[k] = v.map(entry=>{
            // Duplicate the document so the markup doesn't affect the original
            let response = entry.ngram[0].parentDocument().out();
            let doc = nlp.readDoc(response);
            let tokens = doc.tokens();

            let first = tokens.itemAt( entry.ngram[0].index() );
            let last = tokens.itemAt( entry.ngram[entry.ngram.length - 1].index() );

            let tags = ['<span class="match">', '</span>'];
            if(entry.ngram.length == 1) {
                first.markup(tags[0],tags[1]);
            } else {
                first.markup(tags[0],'');
                last.markup('',tags[1]);
            }

            let markup = first.parentDocument().out(its.markedUpText);
            
            // Extract the phrase from the text between the markup
            let phrase = markup.slice(markup.indexOf(tags[0]) + tags[0].length, markup.indexOf(tags[1]));

            return {
                response,
                phrase,
                markup
            };
        });

        // Find the most common phrase
        let phrases = {};
        ngrams[k].forEach(ngram=>{
            if(!phrases[ngram.phrase]) {
                phrases[ngram.phrase] = 0;
            }
            phrases[ngram.phrase]++;
        });
        let commonPhrase = Object.entries(phrases).reduce((a,b)=>a[1] > b[1] ? a : b)[0];

        ngrams[k] = {
            commonPhrase,
            responses: ngrams[k]
        }
    });

    self.postMessage({type:'ngrams', content:{ngrams:ngrams}});
}


var data = null;
var minNgramLength = 1;

self.onmessage = (e) => {
    if(e.data.responses) {
        data = e.data.responses;
    }
    if(e.data.minNgramLength) {
        minNgramLength = e.data.minNgramLength;
    }

    if(data) {
        generateNgrams(data);
    }
};