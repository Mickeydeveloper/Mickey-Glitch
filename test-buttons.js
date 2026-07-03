// Simple test for mbuilder-wrapper
const MBuilderWrapper = require('./lib/mbuilder-wrapper');

async function run() {
    const fakeSock = {}; // dummy
    const text = 'Test Buttons';
    const rows = [
        [ { label: 'One', command: '.one' }, { label: 'Two', command: '.two' } ],
        [ { label: 'Three', command: '.three' } ]
    ];

    const msg = MBuilderWrapper.createButtonWithAIRich(fakeSock, text, rows, 'Footer', { title: 'Title', body: 'Body' });
    console.log('Generated message preview:');
    console.log(JSON.stringify(msg, null, 2));
}

run().catch(console.error);
