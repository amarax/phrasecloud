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
 * @typedef {Object.<string, ngram>} ngrams - The ngrams using a more basic form as the key
 */


function slice(tokenCollection, start, length) {
    let tokens = [];
    for(let i = start; (i < start + length) && (i < tokenCollection.length()); i++) {
        tokens.push(tokenCollection.itemAt(i));
    }
    return tokens;
}


function generateNgrams(data) {
    // Start performance timer
    console.time(`generateNgrams ${minNgramLength}`);

    // Remove repeated responses
    const dataset = [...new Set(data)];
    const responses = dataset.map(r=>nlp.readDoc(r));

    let isLikelyCategoryColumn = data.length > 10 && dataset.length < 0.2 * data.length;
    if(isLikelyCategoryColumn) {
        // Just return the current dataset
        let categories = {};
        data.forEach(response=>{
            let c = response.trim().toLowerCase();
            if(!categories[c]) {
                categories[c] = 0;
            }

            categories[c]++;
        });
        self.postMessage({type:'categories', content:{categories}});
        return;
    }

    self.postMessage({type:'update', content:{responses:responses.length}});

    // For each response, extract tokens for each ngram
    let ngrams = {};
    let usedIndices = [];

    function key(ngram) {
        return ngram.map(t=>t.out(its.stem)).join(' ');
    }

    for(let ngramLength = 6; ngramLength >= minNgramLength; ngramLength--) {
        let newNgrams = {};
        responses.forEach((response, responseIndex) => {
            response.sentences().each( sentence => {
                let s = sentence.tokens().filter(
                    t=>t.out(its.type) == 'word' 
                    && !t.out(its.stopWordFlag)
                    && (!usedIndices[responseIndex]?.has(t.index())) // Only do this for single length ngrams
                );

                for(let i = 0; i <= s.length() - ngramLength; i++) {
                    let ngram = slice(s, i, ngramLength);
                    let k = key(ngram);

                    if(!newNgrams[k]) {
                        newNgrams[k] = [];
                    }
                    newNgrams[k].push({responseIndex, ngram});
                }
            })
        });

        // Remove ngrams that do not repeat
        Object.entries(newNgrams).forEach(([k,v])=>{
            if(v.length < 3) {
                delete newNgrams[k];
            }
        });

        // Remove new ngram instances that are subsets of existing ngrams by checking their indices
        // Generate an array of string indices for each existing ngram to test against
        let existingNgramIndices = [];
        Object.values(ngrams).forEach(entry=>{
            entry.forEach(({responseIndex:ri, ngram:n})=>{
                existingNgramIndices.push({responseIndex:ri , indices:n.map(t=>t.index())});
            });
        });

        if(ngramLength > 1) {
            // Check for subsets
            Object.entries(newNgrams).forEach(([k,v])=>{
                let ngramsToRemove = [];
                v.forEach(({responseIndex, ngram})=>{
                    let isSubset = false;
                    let ngramIndices = ngram.map(t=>t.index());
                    
                    for(let {responseIndex:ri, indices:nIndices} of existingNgramIndices) {
                        if(ri !== responseIndex) {
                            continue;
                        }

                        // If the indices appear in the same sequence in the existing ngram, it's a subset
                        for(let i = 0; i <= nIndices.length - ngramIndices.length; i++) {
                            let isMatch = true;
                            for(let j = 0; j < ngramIndices.length; j++) {
                                if(ngramIndices[j] != nIndices[i + j]) {
                                    isMatch = false;
                                    break;
                                }
                            }
                            if(isMatch) {
                                isSubset = true;
                                break;
                            }
                        }
                    }
                    if(isSubset) {
                        // Remove the ngram
                        ngramsToRemove.push(ngram);
                    }
                });
                ngramsToRemove.forEach(ngram=>{
                    newNgrams[k] = newNgrams[k].filter(({ngram:n})=>n != ngram);
                });
            });
        }
        

        // Merge the new ngrams into the existing ngrams if they are statistically significant
        Object.entries(newNgrams).forEach(([k,v])=>{
            if(v.length < 3) return;

            if(!ngrams[k]) {
                ngrams[k] = [];
            }
            ngrams[k].push(...v);
        });

        // Mark indices of remaining ngrams as used so that single length ngrams don't overlap
        if(ngramLength == 1 + 1) {
            Object.values(ngrams).forEach(entry=>{
                entry.forEach(({responseIndex, ngram})=>{
                    if(usedIndices[responseIndex] === undefined) {
                        usedIndices[responseIndex] = new Set();
                    }

                    ngram.forEach(t=>usedIndices[responseIndex].add(t.index()));
                });
            });
        }
    }

    // Debug: filter all ngrams by those which include the string 'lead'
    // Object.entries(ngrams).forEach(([k,v])=>{
    //     if(k.indexOf('lead') == -1) {
    //         delete ngrams[k];
    //     }
    // });


    const tags = ['<span class="match">', '</span>'];

    // For each ngram, get the original text that's bounded by the first and last token
    Object.entries(ngrams).forEach(([k,v])=>{
        // Create a map of parent documents to duplicated documents
        // This will allow markups to show multiple times in a single response for the same ngram
        // while other ngrams won't affect the markup
        let documentMap = new Map();
        v.forEach(entry=>{
            let parent = entry.ngram[0].parentDocument();
            if(!documentMap.has(parent)) {
                documentMap.set(parent, nlp.readDoc(parent.out()));
            }
        });

        ngrams[k] = v.map(entry=>{
            // Duplicate the document so the markup doesn't affect the original
            let parent = entry.ngram[0].parentDocument();
            let doc = documentMap.get(parent);
            let tokens = doc.tokens();

            let first = tokens.itemAt( entry.ngram[0].index() );
            let last = tokens.itemAt( entry.ngram[entry.ngram.length - 1].index() );

            if(entry.ngram.length == 1) {
                first.markup(tags[0],tags[1]);
            } else {
                first.markup(tags[0],'');
                last.markup('',tags[1]);
            }
        });

        // Find the most common phrase by looking for regex matches in the duplicated documents
        // Build the regex match from the tags
        let regex = new RegExp(`${tags[0]}(.*?)${tags[1]}`, 'g');
        let phrases = {}
        documentMap.forEach(doc=>{
            let matches = doc.out(its.markedUpText).match(regex);
            if(matches) {
                matches.forEach(m=>{
                    let phrase = m.substring(tags[0].length, m.length - tags[1].length);
                    if(!phrases[phrase]) {
                        phrases[phrase] = 0;
                    }
                    phrases[phrase]++;
                });
            }
        });
        
        let commonPhrase = Object.entries(phrases).sort((a,b)=>b[1]-a[1])[0][0];

        ngrams[k] = {
            commonPhrase,
            responses: [...documentMap.values()].map(d=>({
                response: d.out(),
                markup: d.out(its.markedUpText)
            }))
        }
    });

    // End performance timer
    console.timeEnd(`generateNgrams ${minNgramLength}`);


    self.postMessage({type:'ngrams', content:{ngrams}});
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