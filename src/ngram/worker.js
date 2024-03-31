import * as wink from 'wink-nlp';
import * as model from 'wink-eng-lite-web-model';

const nlp = wink( model );
const its = nlp.its;
const as = nlp.as;


// Send a message to the main thread to confirm the worker has started
self.postMessage({type:'ready', content:'Worker started'});
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


const MatchTags = ['<span class="match">', '</span>'];


function slice(tokenCollection, start, length) {
    let tokens = [];
    for(let i = start; (i < start + length) && (i < tokenCollection.length()); i++) {
        tokens.push(tokenCollection.itemAt(i));
    }
    return tokens;
}


function determineCategories(data) {
    let categories = {};
    data.forEach(response=>{
        let c = response.trim().toLowerCase();

        if(!categories[c]) {
            categories[c] = 0;
        }

        categories[c]++;
    });

    return categories;
}

/**
 * 
 * @param {string} structureToken 
 * @param {string} token 
 * @returns {{match:boolean|null, remain?:boolean}}
 */
function isStructureMatch(token, structureToken, prevStructureToken) {
    const Wildcard = '*';

    if(structureToken instanceof Array) {
        let m = false;
        let r;
        for(let s of structureToken) {
            let {match, remain} = isStructureMatch(token, s, prevStructureToken);
            if(match === true) {
                return {match, remain};
            } else if(match === null) {
                m = null;
                r = remain;
            }
        }
        return {match:m, remain:r};
    }

    if(token.out(its.pos) == 'PART' || token.out(its.pos) == 'PUNCT') {
        return {match:null, remain: true};
    }

    if(structureToken == Wildcard) {
        if(token.out(its.stopWordFlag)) {
            return {match:null, remain:true};
        }

        return {match:true};
    }

    if(structureToken === null)
        return {match:null};

    if(PartsOfSpeechTags.includes(structureToken)) {
        if(token.out(its.pos) == structureToken) {
            return {match:true};
        }
    }
    if(structureToken == token.out()) {
        return {match:true};
    }

    if(prevStructureToken == Wildcard) {
        return {match:true, remain:true};
    }
    return {match:false};
}

function ngramsByStructure(dataset, structure, responseInclude) {
    // const patterns = [
    //     { name: 'phrase-structure', patterns: [structure] }
    // ]
    // nlp.learnCustomEntities(patterns);

    let _structure = structure.split(' ').filter(s=>s.trim() != '');
    _structure = _structure.map(s=>{
        // If we start and end with square brackets, we split by the pipe
        if(s.startsWith('[') && s.endsWith(']')) {
            return s.substring(1, s.length - 1).split('|').map(s=>s.length > 0 ? s : null);
        } else {
            return [s];
        }
    });

    let responses = dataset
        .map(r=>nlp.readDoc(r.trim()));

    if(responseInclude) {
        responses = responses.filter(response=>{
            let tokens = response.tokens().out();
            return responseInclude.some(include=>tokens.find(t=>t.toLowerCase().startsWith(include)));
        });
    }

    /** @type {Record<string, {responseIndex: number, match: [number, number]}>} */
    let matches = {};

    // Built-in matching, which doesn't work well with wildcards
    // responses.forEach((response, responseIndex) => {
    //     let _matches = response.customEntities();
    //     _matches.each(match=>{
    //         let key = match.out(its.stem).toLowerCase();
    //         if(!matches[key]) {
    //             matches[key] = [];
    //         }
    //         matches[key].push({responseIndex, match});
    //     });
    // });

    responses.forEach((response, responseIndex) => {
        // Look for a match in the response
        let tokens = response.tokens();

        /** @type {{match:[number, number?], structureNextIndex: number, key:string[]}[]} */
        let openMatches = [];

        for(let i = 0; i < tokens.length(); i++) {
            let token = tokens.itemAt(i);
            
            // First process open matches
            for(let m of openMatches) {
                let structureToken = _structure[m.structureNextIndex];
                let prevStructureToken = m.structureNextIndex > 0 ? _structure[m.structureNextIndex - 1] : null;
                let {match, remain} = isStructureMatch(token, structureToken, prevStructureToken);

                if(match === true || match === null) {
                    if(match === true)
                        m.key.push(token.out(its.stem));

                    if(!remain)
                        m.structureNextIndex++;

                    if(_structure[m.structureNextIndex] === undefined)
                        // debugger;

                    if(m.structureNextIndex == _structure.length) {
                        // We have a match
                        let k = m.key.join(' ');
                        if(!matches[k]) {
                            matches[k] = [];
                        }
                        matches[k].push({responseIndex, match:[m.match[0], i]});

                        // Close the match if we don't end on a wildcard
                        if((structureToken || prevStructureToken)[0] != '*') {
                            openMatches = openMatches.filter(om=>om != m);
                        }
                    }
                } else if(match === false) {
                    openMatches = openMatches.filter(om=>om != m);
                }
            }

            // Then process the current token
            let structureToken = _structure[0];
            let {match, remain} = isStructureMatch(token, structureToken, null);
            if(match === true) {
                let openMatch = {match:[i], structureNextIndex: remain ? 0 : 1, key:[token.out(its.stem)]};
                if(_structure.length == 1 && openMatch.structureNextIndex == 1) {
                    // We have a single word match
                    let k = openMatch.key.join(' ');
                    if(!matches[k]) {
                        matches[k] = [];
                    }
                    matches[k].push({responseIndex, match:[i,i]});
                } else {
                    openMatches.push(openMatch);
                }
            } else if(match === null) {
                // openMatches.push({match:[i], structureNextIndex: remain ? 0 : 1, key:[]});
            }
        }
    });

    // Remove overlapping ngrams by favouring the longer ones
    Object.entries(matches).forEach(([k,v])=>{
        let toRemove = [];
        v.forEach(({responseIndex:i1, match:m1}, i)=>{
            v.forEach(({responseIndex:i2, match:m2}, j)=>{
                if(i == j) return;
                if(i1 != i2) return;
                if(m1[0] >= m2[0] && m1[1] <= m2[1]) {
                    toRemove.push(i);
                }
            });
        });

        matches[k] = v.filter((_,i)=>!toRemove.includes(i));
    });

    // Remove ngrams that do not repeat first, so the next subset checking is done much faster
    Object.entries(matches).forEach(([k,v])=>{
        if(v.length <= 1) {
            delete matches[k];
        }
    });

    // If keys are a subset of another key, remove overlapping results
    Object.entries(matches).forEach(([k1,v1])=>{
        Object.entries(matches).forEach(([k2,v2])=>{
            if(k1 == k2) return;
            if(k2.includes(k1)) {
                matches[k1] = v1.filter(({responseIndex:i1, match:m1})=>{
                    return !v2.some(({responseIndex:i2, match:m2})=>{
                        return i1 == i2 && m1[0] >= m2[0] && m1[1] <= m2[1];
                    });
                })
            }
        });
    });

    Object.entries(matches).forEach(([k,v])=>{
        if(v.length <= 1) {
            delete matches[k];
        }
    });


    let ngrams = {};
    Object.entries(matches).forEach(([k,v])=>{
        let documentMap = new Map();
        v.forEach(({responseIndex, match})=>{
            let parent = responses[responseIndex];
            if(!documentMap.has(parent)) {
                documentMap.set(parent, nlp.readDoc(parent.out()));
            }
        });

        ngrams[k] = {
            responses: v.map(({responseIndex, match})=>{
                let parent = responses[responseIndex];
                let doc = documentMap.get(parent);
                let tokens = doc.tokens();

                let span = match;

                let first = tokens.itemAt( span[0] );
                let last = tokens.itemAt( span[1] );

                if(span[1] == span[0]) {
                    first.markup(MatchTags[0],MatchTags[1]);
                } else {
                    first.markup(MatchTags[0],'');
                    last.markup('',MatchTags[1]);
                }

                return {
                    response: doc.out(),
                    markup: doc.out(its.markedUpText)
                }
            })
        }

        // Find the most common phrase by looking for regex matches in the duplicated documents
        // Build the regex match from the tags
        let regex = new RegExp(`${MatchTags[0]}([\\s\\S]*?)${MatchTags[1]}`, 'g');
        let phrases = {}
        documentMap.forEach(doc=>{
            let matches = doc.out(its.markedUpText).match(regex);
            if(matches) {
                matches.forEach(m=>{
                    let phrase = m.substring(MatchTags[0].length, m.length - MatchTags[1].length);
                    if(!phrases[phrase]) {
                        phrases[phrase] = 0;
                    }
                    phrases[phrase]++;
                });
            } else {
                console.error('No matches', doc.out(its.markedUpText));
            }
        });

        let commonPhrase = Object.entries(phrases).sort((a,b)=>b[1]-a[1])[0][0];
        
        ngrams[k].commonPhrase = commonPhrase;
    });

    return ngrams;
}


function generateNgrams(data) {
    // Start performance timer
    console.time(`generateNgrams ${minNgramLength}`);

    // Remove repeated responses
    const dataset = [...new Set(data)];

    let isLikelyCategoryColumn = data.length > 10 && dataset.length < 0.2 * data.length;
    if(isLikelyCategoryColumn) {
        let categories = determineCategories(data);
        self.postMessage({type:'update', content:{categories:Object.keys(categories).length}});

        self.postMessage({type:'categories', content:{categories}});

        // End performance timer
        console.timeEnd(`generateNgrams ${minNgramLength}`);
        return;
    }

    if(phraseStructure !== null) {
        let ngrams = ngramsByStructure(dataset, phraseStructure, responseInclude);
        self.postMessage({type:'ngrams', content:{ngrams}});

        console.timeEnd(`generateNgrams ${minNgramLength}`);
        return;
    }

    let responses = dataset.map(r=>nlp.readDoc(r.trim())); // Trim because whitespaces will trip up the tokenizer

    // If responseInclude is set, filter out responses that don't include any of the specified stems
    if(responseInclude) {
        responses = responses.filter(response=>{
            // let tokens = response.tokens().out(its.stem);
            let tokens = response.tokens().out();
            return responseInclude.some(include=>tokens.find(t=>t.toLowerCase().startsWith(include)));
        });
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
                    && t.out(its.pos) != 'PART'    // Remove particles
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

        // Remove single ngrams that are inside the responseInclude list
        if(ngramLength == 1 && responseInclude) {
            Object.entries(newNgrams).forEach(([k,v])=>{
                newNgrams[k] = v.filter(({responseIndex, ngram})=>{
                    let word = ngram[0].out().toLowerCase();
                    return !responseInclude.includes(word);
                });
            });
        }

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
                first.markup(MatchTags[0],MatchTags[1]);
            } else {
                first.markup(MatchTags[0],'');
                last.markup('',MatchTags[1]);
            }
        });

        // Find the most common phrase by looking for regex matches in the duplicated documents
        // Build the regex match from the tags
        let regex = new RegExp(`${MatchTags[0]}(.*?)${MatchTags[1]}`, 'g');
        let phrases = {}
        documentMap.forEach(doc=>{
            let matches = doc.out(its.markedUpText).match(regex);
            if(matches) {
                matches.forEach(m=>{
                    let phrase = m.substring(MatchTags[0].length, m.length - MatchTags[1].length);
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
var responseInclude = null;

/** @type {string|null} */
var phraseStructure = null;


// https://universaldependencies.org/u/pos/
const PartsOfSpeechTags = [
    'ADJ',
    'ADP',
    'ADV',
    'AUX',
    'CCONJ',
    'DET',
    'INTJ',
    'NOUN',
    'NUM',
    'PART',
    'PRON',
    'PROPN',
    'PUNCT',
    'SCONJ',
    'SYM',
    'VERB',
    'X',
];

const StructureWildcards = [
    '*', // Any word

]


self.onmessage = (e) => {
    if(e.data.responses) {
        data = e.data.responses;
    }
    if(e.data.minNgramLength) {
        minNgramLength = e.data.minNgramLength;
    }
    if(e.data.include !== undefined) {
        if(e.data.include.trim() == '') {
            responseInclude = null;
        } else {
            // Parse the include string to get a list of stems to include
            // responseInclude = nlp.readDoc(e.data.include).tokens().out(its.stem);
            responseInclude = nlp.readDoc(e.data.include).tokens().out();
            responseInclude = responseInclude.map(t=>t.toLowerCase());
        }
    }
    if(e.data.phraseStructure !== undefined) {
        if(e.data.phraseStructure.trim() == '') {
            phraseStructure = null;
        } else {
            const ANY = `[${PartsOfSpeechTags.join('|')}]`;
            const ANYOREMPTY = `[|${PartsOfSpeechTags.join('|')}]`;
            const ANYUpTo3Words = `${ANY}`;

            // phraseStructure = e.data.phraseStructure.replace(/\*/g, ANYUpTo3Words);
            phraseStructure = e.data.phraseStructure;
        }
    }

    if(data) {
        generateNgrams(data);
    }
};