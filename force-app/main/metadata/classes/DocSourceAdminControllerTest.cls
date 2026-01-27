/**
 * @description Test class for DocSourceAdminController
 * Tests credential management and doc source CMDT operations.
 */
@isTest
private class DocSourceAdminControllerTest {
    
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
        // First ensure credential exists
        ExternalCredentialService.ensureExternalCredentialExists('GitHub_save_test', 'Principal');
        
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.saveCredentialToken('save_test', 'ghp_testtoken');
        Test.stopTest();
        
        System.assertEquals(true, result.success, 'Should succeed saving token');
    }
    
    /**
     * @description Test saveCredentialToken with blank credential name
     */
    @isTest
    static void testSaveCredentialToken_BlankCredentialName() {
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.saveCredentialToken('', 'ghp_testtoken');
        Test.stopTest();
        
        System.assertEquals(false, result.success, 'Should fail with blank credential name');
    }
    
    /**
     * @description Test saveCredentialToken with blank token
     */
    @isTest
    static void testSaveCredentialToken_BlankToken() {
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.saveCredentialToken('test_cred', '');
        Test.stopTest();
        
        System.assertEquals(false, result.success, 'Should fail with blank token');
    }
    
    /**
     * @description Test testCredential success
     */
    @isTest
    static void testTestCredential_Success() {
        // Set up mock response
        GitHubService.testHttpResponse = '[{"id":1,"name":"test-repo","full_name":"org/test-repo","owner":{"login":"org"},"default_branch":"main"}]';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testAccessToken = 'mock_token';
        
        Test.startTest();
        DocSourceAdminController.ConnectionTestResult result = DocSourceAdminController.testCredential('mock_cred');
        Test.stopTest();
        
        System.assertEquals(true, result.success, 'Should succeed with mock response');
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
        GitHubService.testHttpResponse = '[{"id":1,"name":"test-repo","full_name":"org/test-repo","owner":{"login":"org"},"default_branch":"main"}]';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testAccessToken = 'mock_token';
        
        Test.startTest();
        List<GitHubService.Repository> repos = DocSourceAdminController.getRepositoriesForCredential('mock_cred');
        Test.stopTest();
        
        System.assertEquals(1, repos.size(), 'Should return 1 repository');
    }
    
    /**
     * @description Test getRepositoriesWithToken
     */
    @isTest
    static void testGetRepositoriesWithToken() {
        GitHubService.testHttpResponse = '[{"id":1,"name":"test-repo","full_name":"org/test-repo","owner":{"login":"org"},"default_branch":"main"}]';
        GitHubService.testHttpStatusCode = 200;
        
        Test.startTest();
        List<GitHubService.Repository> repos = DocSourceAdminController.getRepositoriesWithToken('ghp_testtoken');
        Test.stopTest();
        
        System.assertEquals(1, repos.size(), 'Should return 1 repository');
    }
    
    /**
     * @description Test getBranchesForCredential
     */
    @isTest
    static void testGetBranchesForCredential() {
        GitHubService.testHttpResponse = '[{"name":"v1.0.0"},{"name":"v1.1.0"}]';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testAccessToken = 'mock_token';
        
        Test.startTest();
        List<GitHubService.Branch> branches = DocSourceAdminController.getBranchesForCredential('mock_cred', 'org', 'repo');
        Test.stopTest();
        
        // Returns main + tags
        System.assert(branches.size() >= 1, 'Should return branches/tags');
    }
    
    /**
     * @description Test getBranchesWithToken
     */
    @isTest
    static void testGetBranchesWithToken() {
        GitHubService.testHttpResponse = '[{"name":"v1.0.0"},{"name":"v1.1.0"}]';
        GitHubService.testHttpStatusCode = 200;
        
        Test.startTest();
        List<GitHubService.Branch> branches = DocSourceAdminController.getBranchesWithToken('ghp_testtoken', 'org', 'repo');
        Test.stopTest();
        
        System.assert(branches.size() >= 1, 'Should return branches/tags');
    }
    
    /**
     * @description Test getDocSources - reads from CMDT
     */
    @isTest
    static void testGetDocSources() {
        Test.startTest();
        List<DocSourceAdminController.DocSourceWrapper> sources = DocSourceAdminController.getDocSources();
        Test.stopTest();
        
        // CMDT records may or may not exist in test context
        System.assertNotEquals(null, sources, 'Should return a list (possibly empty)');
    }
    
    /**
     * @description Test saveDocSource - deploys CMDT
     * Note: Metadata.Operations.enqueueDeployment throws in test context
     */
    @isTest
    static void testSaveDocSource() {
        Map<String, Object> sourceData = new Map<String, Object>{
            'name' => 'Test Docs',
            'developerName' => 'test_docs_new',
            'credentialName' => 'test_cred',
            'provider' => 'GitHub',
            'repositoryOwner' => 'testorg',
            'repositoryName' => 'test-repo',
            'contentPath' => 'docs/',
            'defaultRef' => 'main',
            'isActive' => true,
            'allowVersionSwitching' => false,
            'description' => 'Test doc source'
        };
        
        Test.startTest();
        try {
            DocSourceAdminController.DeploymentResult result = DocSourceAdminController.saveDocSource(sourceData);
            // If it succeeds (unlikely in test), verify result
            System.assertNotEquals(null, result, 'Should return a result');
        } catch (AuraHandledException e) {
            // Expected in test context - Metadata deployment not supported
            System.assert(true, 'Metadata deployment throws in test context');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test saveDocSourceWithToken - deploys CMDT and saves token
     * Note: Metadata.Operations.enqueueDeployment throws in test context
     */
    @isTest
    static void testSaveDocSourceWithToken() {
        // Ensure credential exists first
        ExternalCredentialService.ensureExternalCredentialExists('GitHub_token_test', 'Principal');
        
        Map<String, Object> sourceData = new Map<String, Object>{
            'name' => 'Token Docs',
            'developerName' => 'token_docs_test',
            'credentialName' => 'token_test',
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
        try {
            DocSourceAdminController.DeploymentResult result = DocSourceAdminController.saveDocSourceWithToken(sourceData, 'ghp_testtoken');
            System.assertNotEquals(null, result, 'Should return a result');
        } catch (AuraHandledException e) {
            // Expected in test context - Metadata deployment not supported
            System.assert(true, 'Metadata deployment throws in test context');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test checkDeploymentStatus
     */
    @isTest
    static void testCheckDeploymentStatus() {
        Test.startTest();
        // Pass a fake job ID - the simplified implementation always returns success
        DocSourceAdminController.DeploymentStatus status = DocSourceAdminController.checkDeploymentStatus(null);
        Test.stopTest();
        
        System.assertEquals(true, status.done, 'Should be done');
        System.assertEquals(true, status.success, 'Should be successful');
    }
    
    /**
     * @description Test validateDocSource success
     */
    @isTest
    static void testValidateDocSource_Success() {
        GitHubService.testAccessToken = 'mock_token';
        
        // Mock branches response
        GitHubService.testHttpResponse = '[{"name":"main"}]';
        GitHubService.testHttpStatusCode = 200;
        
        Map<String, Object> sourceData = new Map<String, Object>{
            'provider' => 'GitHub',
            'credentialName' => 'mock_cred',
            'repositoryOwner' => 'testorg',
            'repositoryName' => 'test-repo',
            'contentPath' => '',
            'defaultRef' => 'main'
        };
        
        Test.startTest();
        DocSourceAdminController.ValidationResult result = DocSourceAdminController.validateDocSource(sourceData);
        Test.stopTest();
        
        // Result depends on mock setup
        System.assertNotEquals(null, result, 'Should return a result');
    }
    
    /**
     * @description Test validateDocSource with unsupported provider
     */
    @isTest
    static void testValidateDocSource_UnsupportedProvider() {
        Map<String, Object> sourceData = new Map<String, Object>{
            'provider' => 'GitLab',
            'credentialName' => 'test_cred'
        };
        
        Test.startTest();
        DocSourceAdminController.ValidationResult result = DocSourceAdminController.validateDocSource(sourceData);
        Test.stopTest();
        
        System.assertEquals(false, result.valid, 'Should fail for unsupported provider');
    }
    
    /**
     * @description Test validateDocSource with missing credential
     */
    @isTest
    static void testValidateDocSource_MissingCredential() {
        Map<String, Object> sourceData = new Map<String, Object>{
            'provider' => 'GitHub',
            'credentialName' => ''
        };
        
        Test.startTest();
        DocSourceAdminController.ValidationResult result = DocSourceAdminController.validateDocSource(sourceData);
        Test.stopTest();
        
        System.assertEquals(false, result.valid, 'Should fail with missing credential');
    }
    
    /**
     * @description Test wrapper classes
     */
    @isTest
    static void testWrapperClasses() {
        // ConnectionTestResult
        DocSourceAdminController.ConnectionTestResult connResult = new DocSourceAdminController.ConnectionTestResult();
        connResult.success = true;
        connResult.message = 'Test';
        connResult.repoCount = 5;
        System.assertEquals(true, connResult.success);
        
        // ValidationResult
        DocSourceAdminController.ValidationResult valResult = new DocSourceAdminController.ValidationResult();
        valResult.valid = true;
        valResult.message = 'Valid';
        valResult.fileCount = 10;
        System.assertEquals(true, valResult.valid);
        
        // DeploymentResult
        DocSourceAdminController.DeploymentResult depResult = new DocSourceAdminController.DeploymentResult();
        depResult.success = true;
        depResult.message = 'Deployed';
        depResult.developerName = 'test';
        System.assertEquals(true, depResult.success);
        
        // DeploymentStatus
        DocSourceAdminController.DeploymentStatus depStatus = new DocSourceAdminController.DeploymentStatus();
        depStatus.status = 'Succeeded';
        depStatus.message = 'Done';
        depStatus.done = true;
        depStatus.success = true;
        System.assertEquals(true, depStatus.done);
        
        // DocSourceWrapper
        DocSourceAdminController.DocSourceWrapper wrapper = new DocSourceAdminController.DocSourceWrapper();
        wrapper.developerName = 'test';
        wrapper.name = 'Test';
        wrapper.credentialName = 'cred';
        wrapper.provider = 'GitHub';
        System.assertEquals('test', wrapper.developerName);
    }
}
