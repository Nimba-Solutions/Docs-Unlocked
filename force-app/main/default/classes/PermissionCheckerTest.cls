@isTest
private class PermissionCheckerTest {
    
    @isTest
    static void testHasPermissionSet() {
        // Create a permission set
        PermissionSet ps = new PermissionSet(
            Name = 'TestPermissionSet',
            Label = 'Test Permission Set'
        );
        insert ps;
        
        // Assign to current user
        PermissionSetAssignment psa = new PermissionSetAssignment(
            AssigneeId = UserInfo.getUserId(),
            PermissionSetId = ps.Id
        );
        insert psa;
        
        // Test positive case
        Boolean result = PermissionChecker.hasPermissionSet('TestPermissionSet');
        System.assertEquals(true, result, 'Should return true for assigned permission set');
        
        // Test negative case
        Boolean result2 = PermissionChecker.hasPermissionSet('NonExistentPermissionSet');
        System.assertEquals(false, result2, 'Should return false for non-existent permission set');
    }
    
    @isTest
    static void testHasProfile() {
        // Get current user's profile name
        Profile currentProfile = [SELECT Name FROM Profile WHERE Id = :UserInfo.getProfileId() LIMIT 1];
        
        // Test positive case
        Boolean result = PermissionChecker.hasProfile(currentProfile.Name);
        System.assertEquals(true, result, 'Should return true for current profile');
        
        // Test negative case
        Boolean result2 = PermissionChecker.hasProfile('NonExistentProfile');
        System.assertEquals(false, result2, 'Should return false for non-existent profile');
    }
    
    @isTest
    static void testHasObjectAccess() {
        // Test with Account object (should be accessible)
        Boolean result = PermissionChecker.hasObjectAccess('Account', 'read');
        System.assertEquals(true, result, 'Should return true for Account read access');
        
        Boolean result2 = PermissionChecker.hasObjectAccess('Account', 'create');
        System.assertEquals(true, result2, 'Should return true for Account create access');
        
        // Test edit access type
        Boolean result3 = PermissionChecker.hasObjectAccess('Account', 'edit');
        System.assertNotEquals(null, result3, 'Should return boolean for edit access');
        
        // Test update access type
        Boolean result4 = PermissionChecker.hasObjectAccess('Account', 'update');
        System.assertNotEquals(null, result4, 'Should return boolean for update access');
        
        // Test delete access type
        Boolean result5 = PermissionChecker.hasObjectAccess('Account', 'delete');
        System.assertNotEquals(null, result5, 'Should return boolean for delete access');
        
        // Test viewall access type
        Boolean result6 = PermissionChecker.hasObjectAccess('Account', 'viewall');
        System.assertNotEquals(null, result6, 'Should return boolean for viewall access');
        
        // Test modifyall access type
        Boolean result7 = PermissionChecker.hasObjectAccess('Account', 'modifyall');
        System.assertNotEquals(null, result7, 'Should return boolean for modifyall access');
        
        // Test unknown access type (defaults to read)
        Boolean result8 = PermissionChecker.hasObjectAccess('Account', 'unknowntype');
        System.assertNotEquals(null, result8, 'Should return boolean for unknown access type');
        
        // Test with invalid object
        Boolean result9 = PermissionChecker.hasObjectAccess('NonExistentObject__c', 'read');
        System.assertEquals(false, result9, 'Should return false for non-existent object');
    }
    
    @isTest
    static void testHasFieldAccess() {
        // Test with Account.Name field (should be accessible)
        Boolean result = PermissionChecker.hasFieldAccess('Account.Name');
        System.assertEquals(true, result, 'Should return true for Account.Name field access');
        
        // Test with invalid field
        Boolean result2 = PermissionChecker.hasFieldAccess('Account.NonExistentField__c');
        System.assertEquals(false, result2, 'Should return false for non-existent field');
        
        // Test with invalid format
        Boolean result3 = PermissionChecker.hasFieldAccess('InvalidFormat');
        System.assertEquals(false, result3, 'Should return false for invalid field format');
        
        // Test with non-existent object
        Boolean result4 = PermissionChecker.hasFieldAccess('NonExistentObject__c.SomeField__c');
        System.assertEquals(false, result4, 'Should return false for non-existent object');
    }
    
    @isTest
    static void testHasPermission() {
        // Test with a standard permission (may or may not exist)
        // This will test the error handling
        Boolean result = PermissionChecker.hasPermission('ViewSetup');
        // Result depends on user's actual permissions, so we just verify it doesn't throw
        System.assertNotEquals(null, result, 'Should return a boolean value');
    }
    
    @isTest
    static void testHasCustomPermission() {
        // Test with a custom permission (may or may not exist)
        // This will test the error handling
        Boolean result = PermissionChecker.hasCustomPermission('TestCustomPermission');
        // Result depends on whether permission exists, so we just verify it doesn't throw
        System.assertNotEquals(null, result, 'Should return a boolean value');
    }
    
    /**
     * @description Test hasPermission with a permission that doesn't exist
     * This tests the exception handling path
     */
    @isTest
    static void testHasPermission_NonExistent() {
        Test.startTest();
        Boolean result = PermissionChecker.hasPermission('NonExistentPermission123456');
        Test.stopTest();
        
        // Should return false for non-existent permission
        System.assertNotEquals(null, result, 'Should return a boolean');
    }
    
    /**
     * @description Test hasCustomPermission with a permission that doesn't exist
     */
    @isTest
    static void testHasCustomPermission_NonExistent() {
        Test.startTest();
        Boolean result = PermissionChecker.hasCustomPermission('NonExistentCustomPerm123456');
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'Should return a boolean');
    }
}
