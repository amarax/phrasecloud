import * as wink from 'wink-nlp';
import * as model from 'wink-eng-lite-web-model';



const nlp = wink( model );
const its = nlp.its;
const as = nlp.as;



self.onmessage = (e) => {
    const doc = nlp.readDoc(e.data.text);
    
    const sentences = doc.sentences();

    self.postMessage({type:'update', content:{sentences:sentences.length()}});

    const tokens = sentences.each(sentence => {
        // Remove punctuation and stop words
        let tokens = sentence.tokens().filter( token => {
            return token.out(its.type) === 'word' && token.out(its.stopWordFlag) === false;
        } );

        // console.log( tokens.out(its.lemma) );
    });
};