Ext.define('Emergence.proxy.Records', {
    extend: 'Jarvus.proxy.API',
    alias: 'proxy.records',
    alternateClassName: 'Emergence.ext.proxy.Records',
    requires: [
        'Emergence.util.API',
        'Ext.data.reader.Json',
        'Ext.data.writer.Json',
        'Ext.data.Request'
    ],

    config: {
        connection: 'Emergence.util.API',
        include: null,
        relatedTable: null,
        summary: false,

        /**
         * @cfg The base URL for the managed collection (e.g. '/people')
         * @required
         */
        url: null,

        idParam: 'ID',
        pageParam: false,
        startParam: 'offset',
        limitParam: 'limit',
        sortParam: 'sort',
        directionParam: 'dir',
        filterParam: 'q',
        simpleSortMode: true,
        reader: {
            type: 'json',
            rootProperty: 'data',
            totalProperty: 'total',
            messageProperty: 'message',
            keepRawData: true
        },
        writer: {
            type: 'json',
            rootProperty: 'data',
            writeAllFields: false,
            allowSingle: false
        }
    },


    // config handlers
    applyInclude: function(include) {
        if (!include || !include.length) {
            return null;
        }

        return typeof include == 'string' ? [include] : include;
    },

    updateInclude: function(include) {
        this._includeParam = include ? include.join(',') : null;
    },

    applyRelatedTable: function(relatedTable) {
        var relatedTableConfigs = [],
            length, i = 0, config, relationship, model;

        if (!relatedTable || !relatedTable.length) {
            return null;
        }

        if (!Ext.isArray(relatedTable)) {
            relatedTable = [relatedTable];
        }

        length = relatedTable.length;
        for (; i < length; i++) {
            config = relatedTable[i];

            if (typeof config == 'string') {
                config = {
                    relationship: config
                };
            }

            relationship = config.relationship;

            if (!relationship) {
                Ext.Logger.error('relatedTable config missing required attribute relationship');
            }

            model = config.model;

            if (typeof model == 'string') {
                Ext.syncRequire(model);
                model = config.model = Ext.ClassManager.get(model);
            }

            if (!config.foreignKey) {
                config.foreignKey = model ? model.idProperty : 'ID';
            }

            if (!config.localKey) {
                config.localKey = relationship + 'ID';
            }

            relatedTableConfigs.push(config);
        }

        return relatedTableConfigs;
    },

    updateRelatedTable: function(relatedTable) {
        this._relatedTableParam = relatedTable ? Ext.Array.pluck(relatedTable, 'relationship').join(',') : null;
    },


    /**
     * TODO: overriding this entire method may no longer be necessary given the new Jarvus.proxy.API's template methods
     */
    buildRequest: function(operation) {
        var me = this,
            initialParams = Ext.apply({}, Ext.isFunction(operation.getParams) ? operation.getParams() : operation.params),
            // Clone params right now so that they can be mutated at any point further down the call stack
            params = Ext.applyIf(initialParams, Ext.isFunction(me.getExtraParams) ? me.getExtraParams() : me.extraParams || {}),
            request = new Ext.data.Request({
                action: Ext.isFunction(operation.getAction) ? operation.getAction() : operation.action,
                records: operation.getRecords(),
                operation: operation,
                params: Ext.applyIf(params, me.getParams(operation))
            });

        request.setUrl(operation.getUrl() || me.buildUrl(request));
        request.setMethod(me.getMethod(request));
        request.setHeaders(me.getHeaders(request));
        request.setTimeout(me.getTimeout(request));
        request.setWithCredentials(me.getWithCredentials());

        // compatibility with Jarvus.ext.override.proxy.DirtyParams since we're entirely replacing the buildRequest method it overrides
        if (Ext.isFunction(me.clearParamsDirty)) {
            me.clearParamsDirty();
        }

        operation.setRequest(request);

        return request;
    },

    buildUrl: function(request) {
        var me = this,
            readId = Ext.isFunction(request.getOperation) ? request.getOperation().getId() : request.operation.id,
            idParam = Ext.isFunction(me.getIdParam)? me.getIdParam() : me.idParam,
            baseUrl = me.getUrl(request),
            action = Ext.isFunction(request.getAction) ? request.getAction() : request.action;

        switch (action) {
            case 'read':
                if (readId && (idParam == 'ID' || idParam == 'Handle')) {
                    baseUrl += '/' + encodeURIComponent(readId);
                }
                break;
            case 'create':
            case 'update':
                baseUrl += '/save';
                break;
            case 'destroy':
                baseUrl += '/destroy';
                break;
            default:
                Ext.Logger.error('Unhandled request action');
        }

        return baseUrl;
    },

    getParams: function(operation) {
        var me = this,
            includeParam = me._includeParam,
            relatedTableParam = me._relatedTableParam,
            summary = me.getSummary(),
            idParam = me.idParam,
            id = typeof operation.getId == 'function' ? operation.getId() : operation.id,
            params = me.callParent(arguments);

        if (id && idParam != 'ID') {
            params[idParam] = id;
        }

        if (includeParam) {
            params.include = includeParam;
        }

        if (relatedTableParam) {
            params.relatedTable = relatedTableParam;
        }

        if (summary) {
            params.summary = 'true';
        }

        return params;
    },

    encodeFilters: function(filters) {
        var out = [],
            length = filters.length,
            i = 0, filterData, filterValue;

        for (; i < length; i++) {
            filterData = filters[i].serialize();
            filterValue = filterData.value.toString();
            out[i] = filterData.property+ ':' + (filterValue.match(/\s/) ? '"' + filterValue + '"' : filterValue);
        }

        return out.join(' ');
    },

    getMethod: function(request) {
        switch (request.getAction()) {
            case 'read':
                return 'GET';
            case 'create':
            case 'update':
            case 'destroy':
                return 'POST';
            default:
                Ext.Logger.error('Unhandled request action');
                return null;
        }
    }
});
