/**
 * @description Test class for DocsSourceSelector
 */
@isTest
private class DocsSourceSelectorTest {
    
    @isTest
    static void testGetByDeveloperName() {
        // Custom Metadata Types can't be inserted in tests, but we can still
        // verify the method executes without errors
        Test.startTest();
        Docs_Source__mdt result = DocsSourceSelector.getByDeveloperName('NonExistentSource');
        Test.stopTest();
        
        // Will be null since test data doesn't exist
        System.assertEquals(null, result, 'Should return null for non-existent source');
    }
    
    @isTest
    static void testGetAllActive() {
        Test.startTest();
        List<Docs_Source__mdt> results = DocsSourceSelector.getAllActive();
        Test.stopTest();
        
        // Just verify it executes without error - actual data depends on org
        System.assertNotEquals(null, results, 'Should return a list (possibly empty)');
    }
    
    @isTest
    static void testGetAll() {
        Test.startTest();
        List<Docs_Source__mdt> results = DocsSourceSelector.getAll();
        Test.stopTest();
        
        // Just verify it executes without error - actual data depends on org
        System.assertNotEquals(null, results, 'Should return a list (possibly empty)');
    }
}
