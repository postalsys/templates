module.exports = {
    upgrade: true,
    reject: [
        // no support for Node 16
        'marked',

        // esm issues
        'js-beautify',
        'mjml'
    ]
};
