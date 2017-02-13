'use strict';

require.config({
    baseUrl: 'lib',
    paths: {
        'test': '..',
        'forge': 'forge.min'
    },
    shim: {
        forge: {
            exports: 'forge'
        }
    }

});

require([], function() {

    mocha.setup('bdd');

    require(['test/integration-test'], function() {
        mocha.run();
    });
});