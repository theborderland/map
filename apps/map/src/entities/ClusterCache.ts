export class ClusterCache {
    // Class to cache overlap and area calculations of entities.
    // Since moving or redrawing a entity creates a new leaflet_id we dont have to worry about invalidating cache results.
    private areaCache: { [key: number]: number; } = {};
    private overlapCache: { [key: number]: { [key: number]: Boolean; }; } = {}; // a dict with a dict of booleans eg. x[1][2] = true
    private coordsCache: { [key: string]: Array<{ [key: string]: number; }>; } = {};
    
    public coordsHaveChanged(layerID: any, coords: Array<{ [key: string]: number; }>) {
        //Input: coords -> layer._latlng[0]
        // Returns true  if coords are still the same for layerID and caches new coords if not
        // can be used to check if layerID should be cache invalidated
        let haveChanged = false;

        if (!(layerID in this.coordsCache) ||
            this.coordsCache[layerID].length == 0 ||
            !(this.coordsCache[layerID].length == coords.length)) {
            haveChanged = true;
        } else {
            // they have the same length and this length is not 0
            for (let i = 0; i < this.coordsCache[layerID].length; i++) {
                if (!(
                    this.coordsCache[layerID][i].lat == coords[i].lat &&
                    this.coordsCache[layerID][i].lng == coords[i].lng
                )) {
                    haveChanged = true;
                    break;
                }
            }
        }
        if (haveChanged) {
            // have changed so we update cached value
            const coordsClone = []; // references to objects in arrays change together so we need to do this cloning
            for (let i = 0; i < coords.length; i++) {
                coordsClone.push({ lat: coords[i].lat, lng: coords[i].lng });
            }
            this.coordsCache[layerID] = coordsClone;
            return true;
        } else {
            return false;
        }
    }
    public areaIsCached(layerID: number): Boolean {
        return layerID in this.areaCache;
    }
    public getAreaCache(layerID: number): number {
        return this.areaCache[layerID];
    }
    public setAreaCache(layerID: number, value: number) {
        this.areaCache[layerID] = value;
    }
    public overlapIsCached(layerID1: number, layerID2: number): Boolean {
        return layerID1 in this.overlapCache && layerID2 in this.overlapCache[layerID1];
    }
    public getOverlapCache(layerID1: number, layerID2: number): Boolean {
        return this.overlapCache[layerID1][layerID2];
    }
    public setOverlapCache(layerID1: number, layerID2: number, value: Boolean) {
        for (let layerIDS of [
            [layerID1, layerID2],
            [layerID2, layerID1],
        ]) {
            if (!(layerIDS[0] in this.overlapCache)) {
                this.overlapCache[layerIDS[0]] = {};
            }
            this.overlapCache[layerIDS[0]][layerIDS[1]] = value;
        }
    }
    public invalidateCache(layerID: number) {
        // call this when changes hav been made to a layer meaning we want to calculate anew.
        if (layerID in this.overlapCache) {
            for (let otherLayerID in this.overlapCache[layerID]) {
                if (this.overlapCache[otherLayerID] && layerID in this.overlapCache[otherLayerID]) {
                    delete this.overlapCache[otherLayerID][layerID];
                }
            }
        }
        delete this.overlapCache[layerID];
        if (layerID in this.areaCache) {
            delete this.areaCache[layerID];
        }
    }
}
