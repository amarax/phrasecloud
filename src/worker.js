import * as wink from 'wink-nlp';
import * as model from 'wink-eng-lite-web-model';



const nlp = wink( model );
const its = nlp.its;
const as = nlp.as;



function slice(tokenCollection, start, length) {
    let tokens = [];
    for(let i = start; (i < start + length) && (i < tokenCollection.length()); i++) {
        tokens.push(tokenCollection.itemAt(i));
    }
    return tokens;
}


self.onmessage = (e) => {
    // Remove repeated responses
    const responses = [...new Set(e.data.responses)].map(r=>nlp.readDoc(r));

    self.postMessage({type:'update', content:{responses:responses.length}});

    // For each response, extract tokens for each ngram
    let ngrams = {};
    let usedIndices = [];

    function key(ngram) {
        return ngram.map(t=>t.out(its.lemma)).join(' ');
    }

    for(let ngramLength = 5; ngramLength >= 2; ngramLength--) {
        responses.forEach((response, responseIndex) => {
            response.sentences().each( sentence => {
                let s = sentence.tokens().filter(
                    t=>t.out(its.type) == 'word' 
                    && !t.out(its.stopWordFlag)
                    && !usedIndices[responseIndex]?.has(t.index())
                );

                for(let i = 0; i < s.length() - ngramLength; i++) {
                    let ngram = slice(s, i, ngramLength);
                    let k = key(ngram);

                    if(!ngrams[k]) {
                        ngrams[k] = [];
                    }
                    ngrams[k].push({responseIndex, ngram});
                }
            })
        });

        // Remove ngrams that only appear once
        Object.entries(ngrams).forEach(([k,v])=>{
            if(v.length < 5) {
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
            let first = entry.ngram[0];
            let last = entry.ngram[entry.ngram.length - 1];

            // Extract the shortest substring from the parent document 
            // that's bounded by the first and last token using regex
            let firstText = first.out();
            let lastText = last.out();
            // Replace any regex special characters
            const regexSpecialChars = /[-\/\\^$*+?.()|[\]{}]/g;
            firstText = firstText.replace(regexSpecialChars, '\\$&');
            lastText = lastText.replace(regexSpecialChars, '\\$&');

            let re;
            if (entry.ngram.length === 1) {
                re = new RegExp(`${firstText}`);
            } else {
                re = new RegExp(`${firstText}.*?${lastText}`);
            }

            let match = re.exec(first.parentDocument().out());
            if (match) {
                return {
                    phrase: match[0],
                    response: first.parentDocument().out(),
                    match: [match.index, match.index + match[0].length]
                };
            } else {
                console.error(`No phrase match for ${k}`, first.parentDocument().out());
            }
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
};