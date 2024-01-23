import { csvParseRows } from "d3";
import ngram from "./ngram/ngram";

/**
 * @typedef {Object} Source
 * @property {string[]} data - The data to process for ngrams
 * @property {string} type - The data mimetype, e.g. 'text/csv' or 'text/plain'
 * @property {File} file - The file object, if any
 * @property {string[]} header - The CSV header row, if any
 * @property {Array} ngrams - The ngrams, if it was already generated
 * @property {boolean} loading - Whether the source is loading
 */
var _source = {
    data: null,
    type: null,
    file: null,

    header: null,
    /**
     * Represents the selected table column index for _source.data
     * If null and tableData is available, all columns in the table will be used.
     * @type {null | number}
     */
    columnIndex: null,

    loading: false,
};

const EmptySource = {
    data: null,
    type: null,
    file: null,

    header: null,

    loading: false,
};

/**
 * Represents the full dataset in table form
 * @type {null | string[][]}
 */
var tableData = null;

const defaultTableColumnIndex = 0;

const reader = new FileReader();
reader.onload = async (e) => {
    _source.loading = false;

    if(_source.type === 'text/csv') {
        await loadTableData( csvParseRows( e.target.result ) );
    } else {
        _source.data = e.target.result.split('\n').filter(r=>r.length > 0);
        _source.header = null;defaultTableColumnIndex
    }
    changed();

}

/**
 * @callback eventCallback
 * @param {Source} source - The data source
 * @returns {void}
 */

var _events = {
    /**
     * @type {eventCallback[]}
     */
    change: [],
}

function changed() {
    _events.change.forEach((cb)=>cb(_source));
}


async function loadTableData(table) {
    tableData = table;

    // Remove empty rows
    tableData = tableData.filter((row) => row.length > 0 && row.some((c) => c.length > 0));

    _source.header = tableData.shift();

    // Loop through the columns until we find one that has ngrams in it
    for(let i = 0; i < _source.header.length; i++) {
        let data = tableData.map((row) => row[i]);
        let ngrams = await ngram.generateNgramList(data);
        if(ngrams.length > 0) {
            _source.data = data;
            _source.columnIndex = i;

            // Special case since ngrams are already generated
            _source.ngrams = ngrams;
            
            break;
        }
    }
    
    // If there are no ngrams, use the first column
    if(_source.columnIndex === null) {
        _source.columnIndex = defaultTableColumnIndex;
        _source.data = tableData.map((row) => row[_source.columnIndex]);
        _source.ngrams = [];
    }
}


/**
 * @typedef {Object} DataSource
 * @property {Source} source - The data source
 * @property {number} csvColumnIndex - The selected CSV column index
 */
function construct() {
    return {
        set source(source) {
            _source = {...EmptySource};

            if(source instanceof File) {
                _source.loading = true;
                _source.file = source;
                _source.type = source.type;
                reader.readAsText(_source.file);
            } else if(source instanceof Array && source.every(r=>r instanceof Array)) {
                _source.type = 'text/csv';
                _source.loading = true;
                loadTableData(source).then(()=>{
                    _source.loading = false;
                    changed();
                });
            } else if(typeof source === 'string') {
                _source.data = source.split('\n').filter(r=>r.length > 0);
                _source.type = 'text/plain';
                _source.loading = false;
            }
            changed();
        },

        get source() {
            return _source;
        },

        set tableColumnIndex(index) {
            if(tableData && index !== _source.columnIndex) {
                _source.columnIndex = index;
                _source.data = tableData.map((row) => row[index]);
                _source.ngrams = null;
            }
            changed();
        },

        /**
         * Adds an event listener
         * @param {'change'} event - The event name
         * @param {eventCallback} callback - The callback
         */
        addEventListener: (event, callback) => {
            if(!_events[event]) return;
                
            _events[event].push(callback);
        },
        removeEventListener: (event, callback) => {
            if(!_events[event]) return;
                
            _events[event] = _events[event].filter((cb) => cb !== callback);
        },
    }
}

export default construct;