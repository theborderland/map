(function(window) {
  L.Hash = function(map, promise) {
    this.map = map;
    this.onHashChange = L.Util.bind(this.onHashChange, this);

    if (map) {
      this.init(map);
    }
  };

  /**
   * Attempts to parse and return properties from a hash.
   *
   * On success will return
   * {
   *   view {
   *     center: L.LatLng,
   *      zoom: float|integer,
   *    },
   *   meta: array
   * }
   *
   * On failure will return:
   * {
   *   view false,
   *   meta: array
   * }
   *
   * Reasons for failure include:
   * > Less than 3 arguments passed (requires zoom, lat, lng)
   * > Zoom is not a float (version 1.0.0+), or integer (before version 1)
   * > Lat/Lng values are out of range.
   *
   * The response to "#18.00000/51.49867/-0.14442/buckingham/palace" is
   * {
   *   view {
   *     center: L.LatLng(51.49867, -0.14442),
   *      zoom: 18.00000,
   *    },
   *   meta: ['buckingham', 'palace']
   * }
   *
   * @param {string} hash The full hash from the page, e.g. "#a/b/c"
   * @returns {object} See above notes.
   */
  L.Hash.parseHash = function(hash) {
    let args = hash.substr(1).split("/"); // Assume it starts with a '#'

    // Assuming the map properties validate, everything after them is metadata.
    let meta = args.length > 3 ? args.slice(3) : [];

    if (args.length < 3) {
      return {
        view: false,
        meta: meta,
      }
    }

    var zoom = (L.version >= '1.0.0') ? parseFloat(args[0]) : parseInt(args[0], 10),
      lat = parseFloat(args[1]),
      lng = parseFloat(args[2]);

    // Fail on invalid params
    if (isNaN(zoom) || isNaN(lat) || isNaN(lng)) {
      return {
        view: false,
        meta: meta,
      }
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        view: false,
        meta: meta,
      }
    }

    // All valid, all in range.
    return {
      view: {
        center: new L.LatLng(lat, lng),
        zoom: zoom,
      },
      meta: meta,
    };
  };

  /**
   * Formats a hash for the given properties.
   *
   * Takes map details and formats them according to the following:
   * #<zoom>/<lat>/<lng>/meta1/meta2
   *
   * @param {L.Map} map Leaflet map instance
   * @param {array|null} meta Array of strings for meta data. If null then no
   * values will be added.
   */
  L.Hash.formatHash = function(map, meta) {
    var center = map.getCenter(),
        zoom = map.getZoom(),
        precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));

    meta = typeof meta === 'undefined' ? [] : meta;

    var viewHash = [
      (L.version >= '1.0.0') ? zoom.toFixed(precision) : zoom,
      center.lat.toFixed(precision),
      center.lng.toFixed(precision)
    ];

    return "#" + viewHash.concat(meta).join('/');
  },

  L.Hash.prototype = {
    map: null,
    isListening: false,
    hashMeta: [],
    isSetUp: false,

    parseHash: L.Hash.parseHash,
    formatHash: L.Hash.formatHash,

    /**
     * Associates the map.
     *
     * When map is fully loaded we will perform the setup and associate the
     * current view and meta data to the state.
     *
     * @param {L.map} map
     */
    init: function(map) {
      this.map = map;
      // console.log('running map init()');
      this.map.whenReady(this.setupMap, this);
    },

    /**
     * Performs initial setup.
     *
     * Makes an initial attempt to parse the hash and fires hashmetainit with
     * the initial meta state.
     *
     * Flag we are now "set up" so that subsequent onMapMove events can
     * manipulate the map.
     *
     * If we fail to get #zoom/lat/lng from the URL we just call updateHash to
     * set with current map state.
     *
     * Start listening for events after we have set up hash data.
     */
    setupMap: function() {
      var hash = this.parseHash(location.hash);
      // console.log('setupMap()', hash);
      this.map.fire('hashmetainit', {meta: hash.meta});

      // Force update of hash if the current one is invalid
      this.isSetUp = true;
      if (false === hash.view) {
        console.log('hash view is false');
        this.hashMeta = [];
        this.updateHash();
        this.startListening();
        return;
      } else {
        this.setHashMeta(hash.meta, true);
      }

      this.startListening();
      this.map.setView(hash.view.center, hash.view.zoom);
    },

    /**
     * Returns the precision for toFixed() calls for zoom and lat/lng values.
     *
     * Values are rendered more accuratly when you zoom in.
     */
    getMapPrecision: function() {
      return Math.max(0, Math.ceil(Math.log(this.map.getZoom()) / Math.LN2));
    },

    /**
     * Allows code outside of this plugin to manipulate hash meta data.
     *
     * Will override any existing meta data. Calling this will not result in
     * a hashmetachange event.
     *
     * @param {array} meta Array of string values to be put on the end of the
     * hash.
     * @param {boolean} fireEvents Causes events like hashmetachange to be
     * fired. False by default to avoid your own application being updated when
     * you update the hash and a loop being created.
     */
    setHashMeta: function(meta, fireEvents) {
      // fireEvents is false by default
      fireEvents = typeof fireEvents === 'undefined' ? false : fireEvents;

      var metaChanges = JSON.stringify(this.hashMeta) !== JSON.stringify(meta)

      // console.log('metaChanges', metaChanges);
      if (metaChanges) {
        if (fireEvents) {
          this.map.fire('hashmetachange', {meta: meta, previousMeta: this.hashMeta});
        };

        // Shallow copy the array or we start comparing to the same object.
        this.hashMeta = [...meta];
        this.updateHash();
      }
    },

    /**
     * Called whenever the hash in the URL is changed.
     *
     * When called we attempt to parse the hash that may (or may not) exist, and
     * might be invalid.
     *
     * If parsing results in a missing/invalid hash, remove any meta data and
     * force an update of the hash (which will populate the hash with the
     * current map state).
     *
     * If hash has valid map view data, check if the meta data has changed: if
     * so, fire a *hashmetachange* event with *meta* property.
     *
     * If the view data in the hash doesn't not match the current map (hash in
     * URL has been change by user or external code), update the map view.
     *
     */
    onHashChange: function() {
      var hash = this.parseHash(location.hash);
      // console.log('hash changed', hash);

      // Force update of hash if the current one is invalid
      if (false === hash.view) {
        this.hashMeta = [];
        this.updateHash();
        return;
      }

      // Push the change in hash meta.
      this.setHashMeta(hash.meta, true);

      // Updating the view will update the hash, which in turn will cause this
      // function to be called again. We won't get caught in a loop as if we
      // update the hash, it will match the current map state.
      if (! this.viewMatchesMapState(hash.view)) {
        this.map.setView(hash.view.center, hash.view.zoom);
      }
    },

    /**
     * Checks to see if the passed view matches the current state of the map.
     *
     * An invalid view (false) value will result in a non-match.
     *
     * Zoom, Lat and Lng values must match to consider the view to match map
     * state.
     *
     * @param {object} view Contains *center*  (L.latlng) and *zoom* (float:int)
     */
    viewMatchesMapState: function(view) {
      if (false === view) {
        return false;
      }
      let center = this.map.getCenter();
      let precision = this.getMapPrecision();
      return this.map.getZoom().toFixed(precision) == view.zoom.toFixed(precision)
        && center.lat.toFixed(precision) == view.center.lat
        && center.lng.toFixed(precision) == view.center.lng;
    },

    /**
     * Called on my moveend events so that any zoom/pan operations update the
     * hash.
     *
     * As we might want to pull meta data on initial page load, we hold back
     * on allowing updateHash to be called until we have examined location.hash
     */
    onMapMove: function() {
      if (! this.isSetUp) {
        return;
      }
      this.updateHash();
    },

    /**
     * Called to update the hash for the map, based on map state and meta.
     */
    updateHash: function() {
      // console.log('updating hash', {
      //   from: location.hash,
      //   to: this.formatHash(this.map, this.hashMeta),
      // });
      location.hash = this.formatHash(this.map, this.hashMeta);
    },

    /**
     * Registers event listeners. Window hash changes and map moveend events.
     */
    startListening: function() {
      if (this.isListening) {
        return;
      }

      L.DomEvent.addListener(window, "hashchange", this.onHashChange);
      this.map.on("moveend", this.onMapMove, this);
      this.isListening = true;
    },

    /**
     * Deregisters event listeners. Window hash changes and map moveend events.
     */
    stopListening: function() {
      if (! this.isListening) {
        return;
      }

      this.map.off("moveend", this.onMapMove, this);
      L.DomEvent.removeListener(window, "hashchange", this.onHashChange);
      this.isListening = false;
    },
  };
  L.hash = function(map, promise) {
    return new L.Hash(map, promise);
  };
  L.Map.prototype.addHash = function() {
    this._hash = L.hash(this);
  };
  L.Map.prototype.removeHash = function() {
    this._hash.removeFrom();
  };
})(window);
