@isTest
private class StaticResourceTreeTest {
    
    @TestSetup
    static void setupTestData() {
        // Note: StaticResource cannot be created via DML in tests
        // We'll use an existing StaticResource or create via Metadata API
        // For this test, we'll assume 'docsContent' exists or use SeeAllData=true
    }
    
    @isTest
    static void testGetTree() {
        // Use existing docsContent StaticResource (must exist in org)
        Test.startTest();
        Map<String, Object> tree = StaticResourceTree.getTree('docsContent');
        Test.stopTest();
        
        // Verify tree structure
        System.assertNotEquals(null, tree, 'Tree should not be null');
        System.assert(tree.containsKey('content'), 'Tree should contain content folder');
        
        Object contentObj = tree.get('content');
        System.assert(contentObj instanceof Map<String, Object>, 'Content should be a Map');
    }
    
    @isTest
    static void testGetTreeAsJson() {
        Test.startTest();
        String jsonResult = StaticResourceTree.getTreeAsJson('docsContent');
        Test.stopTest();
        
        // Verify JSON is valid and contains expected structure
        System.assertNotEquals(null, jsonResult, 'JSON should not be null');
        System.assert(jsonResult.length() > 0, 'JSON should not be empty');
        System.assert(jsonResult.contains('content'), 'JSON should contain content');
        
        // Verify it's valid JSON by parsing it
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(jsonResult);
        System.assertNotEquals(null, parsed, 'JSON should be parseable');
    }
    
    @isTest
    static void testGetFileContent() {
        // Get tree first to find a valid file path
        Map<String, Object> tree = StaticResourceTree.getTree('docsContent');
        Map<String, Object> content = (Map<String, Object>) tree.get('content');
        
        // Find first available file path
        String testFilePath = null;
        for (Object sectionObj : content.values()) {
            if (sectionObj instanceof Map<String, Object>) {
                Map<String, Object> section = (Map<String, Object>) sectionObj;
                for (Object filePath : section.values()) {
                    if (filePath instanceof String) {
                        testFilePath = (String) filePath;
                        break;
                    }
                }
                if (testFilePath != null) break;
            }
        }
        
        System.assertNotEquals(null, testFilePath, 'Should find at least one file in test resource');
        
        Test.startTest();
        String contentResult = StaticResourceTree.getFileContent('docsContent', testFilePath);
        Test.stopTest();
        
        // Verify content is retrieved
        System.assertNotEquals(null, contentResult, 'Content should not be null');
        System.assert(contentResult.length() > 0, 'Content should not be empty');
    }
    
    @isTest
    static void testGetFileContentNonExistentFile() {
        Test.startTest();
        String content = StaticResourceTree.getFileContent('docsContent', 'content/nonexistent/file.md');
        Test.stopTest();
        
        // Should return null for non-existent file
        System.assertEquals(null, content, 'Should return null for non-existent file');
    }
    
    @isTest
    static void testGetTreeNonExistentResource() {
        Test.startTest();
        try {
            StaticResourceTree.getTree('NonExistentResource');
            System.assert(false, 'Should have thrown an exception');
        } catch (QueryException e) {
            // Expected - resource doesn't exist
            System.assert(true, 'Expected QueryException for non-existent resource');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testTreeStructure() {
        Map<String, Object> tree = StaticResourceTree.getTree('docsContent');
        
        // Verify tree has expected structure
        System.assertNotEquals(null, tree, 'Tree should not be null');
        
        // Tree should have at least content or media folder
        System.assert(
            tree.containsKey('content') || tree.containsKey('media'),
            'Tree should contain content or media folder'
        );
    }
}
