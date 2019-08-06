/**
 * Provides a tree-structured mirror of a flat dataset with nesting properties.
 *
 * Because tree views decorate models with view state, we create cloned records
 * and bi-directionally sync only the underlying model's fields
 */
Ext.define('Emergence.store.ChainedTree', {
    extend: 'Ext.data.TreeStore',
    alias: 'store.emergence-chainedtree',
    requires: [
        'Ext.data.NodeInterface'
    ],


    config: {
        source: null,
        idProperty: 'ID',
        parentIdProperty: 'ParentID',

        nodeParam: 'parent',
        defaultRootId: 0,
        root: {
            expanded: true
        }
    },

    listeners: {
        add: function(store, records) {
            var me = this,
                sourceStore = me.getSource(),
                Model = sourceStore.getModel(),
                fieldsMap = Model.getFieldsMap(),
                recordsLength = records.length, recordIndex = 0, treeRecord,
                toAdd = [], treeNodeData, data, fieldName, record;

            for (; recordIndex < recordsLength; recordIndex++) {
                treeRecord = records[recordIndex];

                if (treeRecord.isRoot()) {
                    continue;
                }

                if (!sourceStore.getById(treeRecord.getId())) {
                    treeNodeData = treeRecord.getData();
                    data = {};

                    for (fieldName in treeNodeData) {
                        if (fieldsMap[fieldName]) {
                            data[fieldName] = treeNodeData[fieldName];
                        }
                    }

                    record = new Model(data);

                    if (treeRecord.modified) {
                        record.modified = Ext.apply({}, treeRecord.modified);
                    }

                    record.dirty = treeRecord.dirty;
                    record.dropped = treeRecord.dropped;
                    record.phantom = treeRecord.phantom;

                    toAdd.push(record);
                }
            }

            if (toAdd.length) {
                sourceStore.add(toAdd);
            }
        }
    },


    // config handlers
    applySource: function(sourceStore) {
        return Ext.data.StoreManager.lookup(sourceStore);
    },

    updateSource: function(sourceStore) {
        sourceStore.on({
            scope: this,
            load: 'onSourceLoad',
            update: 'onSourceUpdate',
            add: 'onSourceAdd'
        });

        var Model = sourceStore.getModel(),
            TreeModel = Model.prototype.isNode ? Model : null;

        if (!TreeModel) {
            TreeModel = Ext.define(null, {
                extend: Model
            });
        }

        this.setModel(TreeModel);
    },


    // event handlers
    onSourceLoad: function(sourceStore, records) {
        this.loadTreeRecords(records);
    },

    onSourceUpdate: function (sourceStore, sourceRecord, operation, modifiedFieldNames) {
        var record = this.getById(sourceRecord.getId()),
            fieldsLength, i = 0, fieldName,
            commit = false;

        switch (operation) {
            case Ext.data.Model.COMMIT:
                commit = true;
                // fall through
            case Ext.data.Model.EDIT:
                if (!modifiedFieldNames || !record) {
                    break;
                }

                fieldsLength = modifiedFieldNames.length;

                for (; i < fieldsLength; i++) {
                    fieldName = modifiedFieldNames[i];
                    record.set(fieldName, sourceRecord.get(fieldName));
                }

                if (commit) {
                    record.commit();
                }
                break;
            case Ext.data.Model.REJECT:
                if (record) {
                    record.reject();
                }
                break;
        }
    },

    onSourceAdd: function(sourceStore, records) {
        var me = this,
            recordsLength = records.length, recordIndex = 0, record,
            toAdd = [];

        for (; recordIndex < recordsLength; recordIndex++) {
            record = records[recordIndex];

            if (!me.getById(record.getId())) {
                toAdd.push(me.cloneTreeRecord(record));
            }
        }

        if (toAdd.length) {
            me.add(toAdd);
        }
    },

    onUpdate: function(record, operation, modifiedFieldNames) {
        var sourceRecord = this.getSource().getById(record.getId()),
            fieldsLen, i = 0, fieldName,
            fieldsMap,
            commit = false;

        switch (operation) {
            case Ext.data.Model.COMMIT:
                commit = true;
                // fall through
            case Ext.data.Model.EDIT:
                if (!modifiedFieldNames || !sourceRecord) {
                    break;
                }

                fieldsLen = modifiedFieldNames.length;
                fieldsMap = sourceRecord.getFieldsMap();

                for (; i < fieldsLen; i++) {
                    fieldName = modifiedFieldNames[i];
                    if (fieldsMap[fieldName]) {
                        sourceRecord.set(fieldName, record.get(fieldName));
                    }
                }

                if (commit) {
                    sourceRecord.commit();
                }
                break;
            case Ext.data.Model.REJECT:
                if (sourceRecord) {
                    sourceRecord.reject();
                }
                break;
        }

        this.callParent(arguments);
    },


    // member methods
    /**
     * Load a flat array of records into the tree
     */
    loadTreeRecords: function(records) {
        var me = this,
            idProperty = me.getIdProperty(),
            parentIdProperty = me.getParentIdProperty(),
            rootNode = me.getRoot(),
            recordsLength = records.length,
            i = 0, record, parentId, parent;

        me.beginUpdate();
        rootNode.removeAll();

        for (; i < recordsLength; i++) {
            record = records[i];
            parentId = record.get(parentIdProperty);
            parent = parentId ? rootNode.findChild(idProperty, parentId, true) : rootNode;

            if (parent) {
                parent.appendChild(me.cloneTreeRecord(record), true, true);
            } else {
                Ext.Logger.warn('could not find parent for chained tree record');
            }
        };
        me.endUpdate();
    },

    /**
     * Inspired by Model.clone and Model.copy
     * @param {Ext.data.Model} record
     */
    cloneTreeRecord: function(record) {
        if (record.isNode) {
            return record;
        }

        var TreeModel = this.getModel(),
            data = Ext.apply({}, record.data),
            treeRecord = new TreeModel(data),
            modified = record.modified;

        if (modified) {
            treeRecord.modified = Ext.apply({}, modified);
        }

        treeRecord.dirty = record.dirty;
        treeRecord.dropped = record.dropped;
        treeRecord.phantom = record.phantom;

        return treeRecord;
    }
});
