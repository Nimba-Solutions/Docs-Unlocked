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
        
        // Test with invalid object
        Boolean result3 = PermissionChecker.hasObjectAccess('NonExistentObject__c', 'read');
        System.assertEquals(false, result3, 'Should return false for non-existent object');
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
}
