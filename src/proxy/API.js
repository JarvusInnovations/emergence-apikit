/*jslint browser: true, undef: true *//*global Ext*/
/**
 * TODO:
 * - Just extend Server and deprecated the other stuff Ajax does? callParent for buildrequest?
 */
Ext.define('Emergence.proxy.API', {
    extend: 'Jarvus.proxy.API',
    alias: 'proxy.emergenceapi',
    requires: [
        'Jarvus.util.API'
    ],

    getMethod: function(request) {
        switch (request.getAction()) {
            case 'create':
                return 'POST';
            case 'read':
                return 'GET';
            case 'update':
                return 'POST';
            case 'destroy':
                return 'DELETE';
        }
    }
});
