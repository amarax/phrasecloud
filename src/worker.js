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
    const responses = e.data.responses.map(r=>nlp.readDoc(r));

    self.postMessage({type:'update', content:{responses:responses.length}});

    // For each response, extract tokens for each ngram
    let ngrams = {};

    function key(ngram) {
        return ngram.map(t=>t.out(its.normal)).join(' ');
    }

    for(let ngramLength = 5; ngramLength >= 1; ngramLength--) {
        responses.forEach(response => {
            response.sentences().each( sentence => {
                let s = sentence.tokens().filter(t=>t.out(its.pos) !== 'PUNCT' && !t.out(its.stopWordFlag));

                for(let i = 0; i < s.length() - ngramLength; i++) {
                    let ngram = slice(s, i, ngramLength);
                    let k = key(ngram);

                    if(!ngrams[k]) {
                        ngrams[k] = [];
                    }
                    ngrams[k].push(ngram);
                }
            })
        });

        // Remove ngrams that only appear once
        Object.entries(ngrams).forEach(([k,v])=>{
            if(v.length < 5) {
                delete ngrams[k];
            }
        });
    }

    // For each ngram, get the original text that's bounded by the first and last token
    Object.entries(ngrams).forEach(([k,v])=>{
        ngrams[k] = v.map(ngram=>{
            let first = ngram[0];
            let last = ngram[ngram.length-1];
            return {
                phrase: first.parentDocument().tokens().out().slice(first.index(), last.index()+1),
                response: first.parentDocument().out()
            };
        });
    });

    self.postMessage({type:'ngrams', content:{ngrams:ngrams}});
};