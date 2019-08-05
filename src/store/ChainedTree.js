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
        defaultRootId: 0
    },


    // config handlers
    applySource: function(sourceStore) {
        return Ext.data.StoreManager.lookup(sourceStore);
    },

    updateSource: function(sourceStore) {
        sourceStore.on({
            scope: this,
            load: 'onSourceLoad',
            update: 'onSourceUpdate'
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
            fieldsLen, i = 0, fieldName,
            commit = false;

        switch (operation) {
            case Ext.data.Model.COMMIT:
                commit = true;
                // fall through
            case Ext.data.Model.EDIT:
                if (!modifiedFieldNames || !record) {
                    break;
                }

                fieldsLen = modifiedFieldNames.length;

                for (; i < fieldsLen; i++) {
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
        var idProperty = this.getIdProperty(),
            parentIdProperty = this.getParentIdProperty(),
            rootNode = this.getRootNode(),
            recordsLength = records.length,
            i = 0, record, parentId, parent;

        rootNode.removeAll();

        for (; i < recordsLength; i++) {
            record = records[i];
            parentId = record.get(parentIdProperty);
            parent = parentId ? rootNode.findChild(idProperty, parentId, true) : rootNode;

            if (parent) {
                parent.appendChild(this.cloneTreeRecord(record), true, true);
            } else {
                Ext.Logger.warn('could not find parent for chained tree record');
            }
        };
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
