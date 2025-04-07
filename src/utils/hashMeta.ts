import { showDrawer } from '../messages';
const LAYERS_KEY = 'layers:';
const PAGE_KEY = 'page:';

class HashMetaImplementation {
    private _leafletHash: any = null;
    private _leafletMap: any = null;
    private _hashMeta: string[] = [];
    private _layers: string[] = [];
    private _page: string | undefined = undefined;

    set map(val) {
        this._leafletMap = val;
        //@ts-ignore NOTE: No typings for global Leaflet exists
        this._leafletHash = new L.Hash(this._leafletMap);
    }

    get layers() {
        return this._layers;
    }
    set layers(val) {
        if (val instanceof Set) {
            val = Array.from(val);
        }

        this._layers = val;
        this.encode();
    }

    get page() {
        return this._page;
    }
    set page(val) {
        this._page = val;
        this.encode();
    }

    private encode() {
        this._hashMeta = [];

        // Encode any selected layers
        if (this._layers.length > 0) {
            this._hashMeta.push(LAYERS_KEY + this._layers.join(','));
        }

        // Encode any page opened in the drawer
        if (this._page && this._page.length > 0) {
            this._hashMeta.push(PAGE_KEY + this._page);
        }

        // Update the hash metadata in in the URL
        this._leafletHash.setHashMeta(this._hashMeta, true);
    }

    public decode(hashMeta: string[]) {
        this._hashMeta = hashMeta;

        // Decode any layers
        const layersVal = this._hashMeta.find((val) => val.startsWith(LAYERS_KEY));
        this._layers = layersVal ? layersVal.substring(LAYERS_KEY.length).split(',') : [];

        // Decode any opened page
        const pageVal = this._hashMeta.find((val) => val.startsWith(PAGE_KEY));
        this._page = pageVal ? pageVal.substring(PAGE_KEY.length) : undefined;
        // Do not open the edit-entity drawer here because we cannot give it an entity to populate the fields.
        if (this._page && this._page !== 'edit-entity') {
            showDrawer({ file: this.page, position: 'end' });
        }
    }

    constructor() {
        // Capture manual meta data changes
        window.addEventListener('hashchange', () => {
            if (location.hash.indexOf(LAYERS_KEY) == 1 || location.hash.indexOf(PAGE_KEY) == 1) {
            } else {
                return;
            }
            const hashMetadatas = location.hash.substring(1).split('/');
            for (const hashMetadata of hashMetadatas) {
                if (hashMetadata.indexOf(LAYERS_KEY) == 0) {
                    this.layers = hashMetadata.substring(LAYERS_KEY.length).split(',');
                }
                if (hashMetadata.indexOf(PAGE_KEY) == 0) {
                    this.page = hashMetadata.substring(PAGE_KEY.length);
                    showDrawer({ file: this.page, position: 'end' });
                }
            }
        });
    }
}

/** Is used to keep track of metadata in the hash portion of the URL in addition to the map coordinates */
export const hash = new HashMetaImplementation();
