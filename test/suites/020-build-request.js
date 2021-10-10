describe('Build request', function () {
    it('is configured correctly', function () {
        var proxy = new Emergence.proxy.Records({
                url: './records',
                timeout: 12345
            }),
            operation = proxy.createOperation('read', {

            }),
            store = new Ext.data.Store({
                proxy: proxy
            }),
            request = proxy.buildRequest(operation);

        expect(request.getWithCredentials()).to.be.ok();
        expect(request.getTimeout()).to.equal(12345);

        expect(request.getMethod()).to.equal('GET');
        expect(request.getUrl()).to.equal('./records');
        expect(request.getParams()).to.be.empty();
    });
});