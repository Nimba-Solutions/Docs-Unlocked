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
            Credential_Name__c = 'test_cred',
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
     * @description Test ensureCredential success
     */
    @isTest
    static void testEnsureCredential_Success() {
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.ensureCredential('test_cred');
        Test.stopTest();
        
        System.assertEquals(true, result.success, 'Should succeed');
    }
    
    /**
     * @description Test ensureCredential with blank credential name
     */
    @isTest
    static void testEnsureCredential_BlankCredentialName() {
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.ensureCredential('');
        Test.stopTest();
        
        System.assertEquals(false, result.success, 'Should fail with blank credential name');
    }
    
    /**
     * @description Test saveCredentialToken success
     */
    @isTest
    static void testSaveCredentialToken_Success() {
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.saveCredentialToken('test_cred', 'ghp_testtoken');
        Test.stopTest();
        
        System.assertEquals(true, result.success, 'Should succeed');
        // Verify token was saved
        String savedToken = ExternalCredentialService.getPAT('GitHub_test_cred', 'Principal');
        System.assertEquals('ghp_testtoken', savedToken, 'Token should be saved');
    }
    
    /**
     * @description Test saveCredentialToken with blank values
     */
    @isTest
    static void testSaveCredentialToken_BlankValues() {
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result1 = DocSourceAdminController.saveCredentialToken('', 'token');
        DocSourceAdminController.ConnectionTestResult result2 = DocSourceAdminController.saveCredentialToken('cred', '');
        Test.stopTest();
        
        System.assertEquals(false, result1.success, 'Should fail with blank credential name');
        System.assertEquals(false, result2.success, 'Should fail with blank token');
    }
    
    /**
     * @description Test testCredential success (uses saved credential)
     */
    @isTest
    static void testTestCredential_Success() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[{"id": 1, "name": "repo1", "full_name": "org/repo1", "default_branch": "main", "private": false, "owner": {"login": "org"}}]';
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'GitHub_test_cred.Principal.token' => 'test-token'
        };
        
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.testCredential('test_cred');
        Test.stopTest();
        
        System.assertEquals(true, result.success, 'Should succeed');
        System.assertEquals(1, result.repoCount, 'Should find 1 repo');
    }
    
    /**
     * @description Test testCredential with blank credential name
     */
    @isTest
    static void testTestCredential_BlankCredentialName() {
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.testCredential('');
        Test.stopTest();
        
        System.assertEquals(false, result.success, 'Should fail with blank credential name');
    }
    
    /**
     * @description Test getRepositoriesForCredential
     */
    @isTest
    static void testGetRepositoriesForCredential() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[{"id": 1, "name": "repo1", "full_name": "org/repo1", "default_branch": "main", "private": false, "owner": {"login": "org"}}]';
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'GitHub_test_cred.Principal.token' => 'test-token'
        };
        
        Test.startTest();
        List<GitHubService.Repository> repos = DocSourceAdminController.getRepositoriesForCredential('test_cred');
        Test.stopTest();
        
        System.assertEquals(1, repos.size(), 'Should return 1 repo');
    }
    
    /**
     * @description Test getBranchesForCredential
     */
    @isTest
    static void testGetBranchesForCredential() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[{"name": "main", "commit": {"sha": "abc123"}}]';
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'GitHub_test_cred.Principal.token' => 'test-token'
        };
        
        Test.startTest();
        List<GitHubService.Branch> branches = DocSourceAdminController.getBranchesForCredential('test_cred', 'org', 'repo');
        Test.stopTest();
        
        System.assertEquals(1, branches.size(), 'Should return 1 branch');
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
        System.assertEquals('test_cred', sources[0].credentialName, 'Credential name should match');
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
            'credentialName' => 'new_cred',
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
        System.assertEquals('new_cred', result.credentialName, 'Credential name should match');
    }
    
    /**
     * @description Test saveDocSourceWithToken
     */
    @isTest
    static void testSaveDocSourceWithToken() {
        Map<String, Object> sourceData = new Map<String, Object>{
            'name' => 'Token Docs',
            'appIdentifier' => 'token_docs',
            'credentialName' => 'token_cred',
            'provider' => 'GitHub',
            'repositoryOwner' => 'tokenorg',
            'repositoryName' => 'token-repo',
            'contentPath' => '',
            'defaultRef' => 'main',
            'isActive' => true,
            'allowVersionSwitching' => false,
            'description' => ''
        };
        
        Test.startTest();
        DocSourceAdminController.DocSourceWrapper result = DocSourceAdminController.saveDocSourceWithToken(sourceData, 'ghp_testtoken');
        Test.stopTest();
        
        System.assertNotEquals(null, result.id, 'Should have an ID');
        // Verify token was saved
        String savedToken = ExternalCredentialService.getPAT('GitHub_token_cred', 'Principal');
        System.assertEquals('ghp_testtoken', savedToken, 'Token should be saved');
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
            'credentialName' => 'updated_cred',
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
        System.assertEquals('updated_cred', result.credentialName, 'Credential name should be updated');
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
            'credentialName' => 'test',
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
     * @description Test validateDocSource - missing credential
     */
    @isTest
    static void testValidateDocSource_MissingCredential() {
        Map<String, Object> sourceData = new Map<String, Object>{
            'provider' => 'GitHub',
            'credentialName' => '',
            'repositoryOwner' => 'org',
            'repositoryName' => 'repo',
            'contentPath' => 'docs/',
            'defaultRef' => 'main'
        };
        
        Test.startTest();
        DocSourceAdminController.ValidationResult result = DocSourceAdminController.validateDocSource(sourceData);
        Test.stopTest();
        
        System.assertEquals(false, result.valid, 'Should be invalid');
        System.assert(result.message.contains('Credential'), 'Should mention credential');
    }
    
    /**
     * @description Test validateDocSource - success
     */
    @isTest
    static void testValidateDocSource_Success() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[{"name": "main", "commit": {"sha": "abc"}}]';
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'GitHub_test_cred.Principal.token' => 'test-token'
        };
        
        Map<String, Object> sourceData = new Map<String, Object>{
            'provider' => 'GitHub',
            'credentialName' => 'test_cred',
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
        wrapper.credentialName = 'cred';
        System.assertEquals('Test', wrapper.name);
        System.assertEquals('cred', wrapper.credentialName);
        
        Test.stopTest();
    }
    
    /**
     * @description Test getRepositoriesWithToken - uses raw token directly
     */
    @isTest
    static void testGetRepositoriesWithToken() {
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[{"id": 1, "name": "repo1", "full_name": "org/repo1", "default_branch": "main", "private": false, "owner": {"login": "org"}}]';
        
        Test.startTest();
        List<GitHubService.Repository> repos = DocSourceAdminController.getRepositoriesWithToken('ghp_testtoken');
        Test.stopTest();
        
        System.assertEquals(1, repos.size(), 'Should return 1 repo');
        System.assertEquals('repo1', repos[0].name, 'Repo name should match');
    }
    
    /**
     * @description Test getBranchesWithToken - uses raw token directly
     */
    @isTest
    static void testGetBranchesWithToken() {
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[{"name": "main", "commit": {"sha": "abc123"}}, {"name": "develop", "commit": {"sha": "def456"}}]';
        
        Test.startTest();
        List<GitHubService.Branch> branches = DocSourceAdminController.getBranchesWithToken('ghp_testtoken', 'org', 'repo');
        Test.stopTest();
        
        System.assertEquals(2, branches.size(), 'Should return 2 branches');
        System.assertEquals('main', branches[0].name, 'First branch name should match');
    }
}
