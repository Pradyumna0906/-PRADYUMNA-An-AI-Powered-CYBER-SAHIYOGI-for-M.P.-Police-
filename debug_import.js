try {
    const { groqTools, executeTool } = require('./backend/tools');
    console.log('groqTools defined:', typeof groqTools);
    console.log('groqTools length:', groqTools ? groqTools.length : 'N/A');
    console.log('executeTool defined:', typeof executeTool);
} catch (err) {
    console.error('Import error:', err.message);
}
