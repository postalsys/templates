'use strict';

module.exports = {
    upgrade: true,
    target: name => {
        // marked is held to the 15.x line: 16.x dropped the CommonJS build and is ESM-only, which this
        // library and the EmailEngine binary it is bundled into (via @yao-pkg/pkg) cannot load.
        if (name === 'marked') {
            return 'minor';
        }
        // @types/node stays on the 20.x line so the compiler rejects APIs that do
        // not exist on Node 20, the oldest supported version
        if (name === '@types/node') {
            return 'minor';
        }
        // typescript-eslint declares a peer range that excludes TypeScript 7
        if (name === 'typescript') {
            return 'minor';
        }
        return 'latest';
    }
};
