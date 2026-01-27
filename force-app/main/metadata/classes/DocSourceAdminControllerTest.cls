/**
 * @description Test class for DocSourceAdminController
 */
@isTest
private class DocSourceAdminControllerTest {
    
    @TestSetup
    static void setupTestData() {
        Doc_Source__c source = new Doc_Source__c(
            Name = 'Test Docs',
            App_Identifier__c = 'test_docs',
            Provider__c = 'GitHub',
            Repository_Owner__c = 'myorg',
            Repository_Name__c = 'documentation',
            Content_Path__c = 'docs/',
            Default_Ref__c = 'main',
            Is_Active__c = true,
            Allow_Version_Switching__c = true,
            Description__c = 'Test documentation source'
        );
        insert source;
    }
    
    /**
     * @description Test isGitHubConfigured when token is set
     */
    @isTest
    static void testIsGitHubConfigured_True() {
        GitHubService.testAccessToken = 'test-token';
        
        Test.startTest();
        Boolean isConfigured = DocSourceAdminController.isGitHubConfigured();
        Test.stopTest();
        
        System.assertEquals(true, isConfigured, 'Should return true when token is set');
    }
    
    /**
     * @description Test isGitHubConfigured when no token
     */
    @isTest
    static void testIsGitHubConfigured_False() {
        GitHubService.testAccessToken = null;
        ExternalCredentialService.testCredentialValues = new Map<String, String>();
        
        Test.startTest();
        Boolean isConfigured = DocSourceAdminController.isGitHubConfigured();
        Test.stopTest();
        
        System.assertEquals(false, isConfigured, 'Should return false when no token');
    }
    
    /**
     * @description Test saveGitHubToken
     */
    @isTest
    static void testSaveGitHubToken() {
        Test.startTest();
        DocSourceAdminController.saveGitHubToken('ghp_testtoken');
        String savedToken = ExternalCredentialService.getPAT(GitHubService.EXTERNAL_CREDENTIAL_NAME, GitHubService.PRINCIPAL_NAME);
        Test.stopTest();
        
        System.assertEquals('ghp_testtoken', savedToken, 'Token should be saved');
    }
    
    /**
     * @description Test testGitHubConnection success
     */
    @isTest
    static void testTestGitHubConnection_Success() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[{"id": 1, "name": "repo1", "full_name": "org/repo1", "default_branch": "main", "private": false, "owner": {"login": "org"}}]';
        
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.testGitHubConnection();
        Test.stopTest();
        
        System.assertEquals(true, result.success, 'Should succeed');
        System.assertEquals(1, result.repoCount, 'Should find 1 repo');
    }
    
    /**
     * @description Test testGitHubConnection failure
     */
    @isTest
    static void testTestGitHubConnection_Failure() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 401;
        GitHubService.testHttpResponse = '{"message": "Bad credentials"}';
        
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.testGitHubConnection();
        Test.stopTest();
        
        System.assertEquals(false, result.success, 'Should fail');
        System.assert(result.message.contains('failed'), 'Should indicate failure');
    }
    
    /**
     * @description Test getDocSources
     */
    @isTest
    static void testGetDocSources() {
        Test.startTest();
        List<DocSourceAdminController.DocSourceWrapper> sources = DocSourceAdminController.getDocSources();
        Test.stopTest();
        
        System.assertEquals(1, sources.size(), 'Should return 1 source');
        System.assertEquals('test_docs', sources[0].appIdentifier, 'App identifier should match');
        System.assertEquals('GitHub', sources[0].provider, 'Provider should match');
    }
    
    /**
     * @description Test saveDocSource - create new
     */
    @isTest
    static void testSaveDocSource_Create() {
        Map<String, Object> sourceData = new Map<String, Object>{
            'name' => 'New Docs',
            'appIdentifier' => 'new_docs',
            'provider' => 'GitHub',
            'repositoryOwner' => 'neworg',
            'repositoryName' => 'new-repo',
            'contentPath' => 'content/',
            'defaultRef' => 'main',
            'isActive' => true,
            'allowVersionSwitching' => false,
            'description' => 'New doc source'
        };
        
        Test.startTest();
        DocSourceAdminController.DocSourceWrapper result = DocSourceAdminController.saveDocSource(sourceData);
        Test.stopTest();
        
        System.assertNotEquals(null, result.id, 'Should have an ID');
        System.assertEquals('new_docs', result.appIdentifier, 'App identifier should match');
        
        // Verify in database
        List<Doc_Source__c> sources = [SELECT Id FROM Doc_Source__c WHERE App_Identifier__c = 'new_docs'];
        System.assertEquals(1, sources.size(), 'Should be saved in database');
    }
    
    /**
     * @description Test saveDocSource - update existing
     */
    @isTest
    static void testSaveDocSource_Update() {
        Doc_Source__c existing = [SELECT Id FROM Doc_Source__c WHERE App_Identifier__c = 'test_docs' LIMIT 1];
        
        Map<String, Object> sourceData = new Map<String, Object>{
            'id' => existing.Id,
            'name' => 'Updated Docs',
            'appIdentifier' => 'test_docs',
            'provider' => 'GitHub',
            'repositoryOwner' => 'updatedorg',
            'repositoryName' => 'updated-repo',
            'contentPath' => 'newpath/',
            'defaultRef' => 'develop',
            'isActive' => true,
            'allowVersionSwitching' => true,
            'description' => 'Updated description'
        };
        
        Test.startTest();
        DocSourceAdminController.DocSourceWrapper result = DocSourceAdminController.saveDocSource(sourceData);
        Test.stopTest();
        
        System.assertEquals(existing.Id, result.id, 'ID should match');
        System.assertEquals('updatedorg', result.repositoryOwner, 'Owner should be updated');
    }
    
    /**
     * @description Test deleteDocSource
     */
    @isTest
    static void testDeleteDocSource() {
        Doc_Source__c toDelete = [SELECT Id FROM Doc_Source__c WHERE App_Identifier__c = 'test_docs' LIMIT 1];
        
        Test.startTest();
        DocSourceAdminController.deleteDocSource(toDelete.Id);
        Test.stopTest();
        
        List<Doc_Source__c> remaining = [SELECT Id FROM Doc_Source__c WHERE Id = :toDelete.Id];
        System.assertEquals(0, remaining.size(), 'Should be deleted');
    }
    
    /**
     * @description Test validateDocSource - unsupported provider
     */
    @isTest
    static void testValidateDocSource_UnsupportedProvider() {
        Map<String, Object> sourceData = new Map<String, Object>{
            'provider' => 'GitLab',
            'repositoryOwner' => 'org',
            'repositoryName' => 'repo',
            'contentPath' => 'docs/',
            'defaultRef' => 'main'
        };
        
        Test.startTest();
        DocSourceAdminController.ValidationResult result = DocSourceAdminController.validateDocSource(sourceData);
        Test.stopTest();
        
        System.assertEquals(false, result.valid, 'Should be invalid');
        System.assert(result.message.contains('GitHub'), 'Should mention GitHub');
    }
    
    /**
     * @description Test validateDocSource - success
     */
    @isTest
    static void testValidateDocSource_Success() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[{"name": "main", "commit": {"sha": "abc"}}]';
        
        Map<String, Object> sourceData = new Map<String, Object>{
            'provider' => 'GitHub',
            'repositoryOwner' => 'org',
            'repositoryName' => 'repo',
            'contentPath' => '',
            'defaultRef' => 'main'
        };
        
        Test.startTest();
        DocSourceAdminController.ValidationResult result = DocSourceAdminController.validateDocSource(sourceData);
        Test.stopTest();
        
        System.assertEquals(true, result.valid, 'Should be valid');
    }
    
    /**
     * @description Test wrapper classes
     */
    @isTest
    static void testWrapperClasses() {
        Test.startTest();
        
        // ConnectionTestResult
        DocSourceAdminController.ConnectionTestResult connResult = new DocSourceAdminController.ConnectionTestResult();
        connResult.success = true;
        connResult.message = 'Connected';
        connResult.repoCount = 5;
        System.assertEquals(true, connResult.success);
        
        // ValidationResult
        DocSourceAdminController.ValidationResult valResult = new DocSourceAdminController.ValidationResult();
        valResult.valid = true;
        valResult.message = 'Valid';
        valResult.fileCount = 10;
        System.assertEquals(10, valResult.fileCount);
        
        // DocSourceWrapper - empty constructor
        DocSourceAdminController.DocSourceWrapper wrapper = new DocSourceAdminController.DocSourceWrapper();
        wrapper.name = 'Test';
        System.assertEquals('Test', wrapper.name);
        
        Test.stopTest();
    }
}
