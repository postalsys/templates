module.exports = {
    upgrade: true,
    // marked is held to the 15.x line: 16.x dropped the CommonJS build and is ESM-only, which this
    // library and the EmailEngine binary it is bundled into (via @yao-pkg/pkg) cannot load.
    target: name => (name === 'marked' ? 'minor' : 'latest')
};
