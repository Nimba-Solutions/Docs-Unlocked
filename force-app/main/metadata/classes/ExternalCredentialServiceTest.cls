/**
 * @description Test class for ExternalCredentialService
 * Note: ConnectApi methods cannot be fully tested in unit tests.
 * These tests verify code paths using test-visible overrides where possible.
 */
@isTest
private class ExternalCredentialServiceTest {
    
    /**
     * @description Test getPAT with test override
     */
    @isTest
    static void testGetPAT_WithTestOverride() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'GitHub.Principal.token' => 'ghp_test123456'
        };
        
        Test.startTest();
        String token = ExternalCredentialService.getPAT('GitHub', 'Principal');
        Test.stopTest();
        
        System.assertEquals('ghp_test123456', token, 'Should return the test token');
    }
    
    /**
     * @description Test getPAT with default principal
     */
    @isTest
    static void testGetPAT_DefaultPrincipal() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'GitHub.Principal.token' => 'ghp_default123'
        };
        
        Test.startTest();
        String token = ExternalCredentialService.getPAT('GitHub');
        Test.stopTest();
        
        System.assertEquals('ghp_default123', token, 'Should return token using default principal');
    }
    
    /**
     * @description Test setPAT stores value correctly
     */
    @isTest
    static void testSetPAT() {
        Test.startTest();
        ExternalCredentialService.setPAT('GitHub', 'Principal', 'ghp_newtoken');
        String token = ExternalCredentialService.getPAT('GitHub', 'Principal');
        Test.stopTest();
        
        System.assertEquals('ghp_newtoken', token, 'Should retrieve the stored token');
    }
    
    /**
     * @description Test setPAT with default principal
     */
    @isTest
    static void testSetPAT_DefaultPrincipal() {
        Test.startTest();
        ExternalCredentialService.setPAT('GitHub', 'ghp_defaulttoken');
        String token = ExternalCredentialService.getPAT('GitHub');
        Test.stopTest();
        
        System.assertEquals('ghp_defaulttoken', token, 'Should retrieve token with default principal');
    }
    
    /**
     * @description Test hasPAT returns true when configured
     */
    @isTest
    static void testHasPAT_True() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'GitHub.Principal.token' => 'ghp_exists'
        };
        
        Test.startTest();
        Boolean hasPat = ExternalCredentialService.hasPAT('GitHub', 'Principal');
        Test.stopTest();
        
        System.assertEquals(true, hasPat, 'Should return true when PAT exists');
    }
    
    /**
     * @description Test hasPAT returns false when not configured
     */
    @isTest
    static void testHasPAT_False() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>();
        
        Test.startTest();
        Boolean hasPat = ExternalCredentialService.hasPAT('GitHub', 'Principal');
        Test.stopTest();
        
        System.assertEquals(false, hasPat, 'Should return false when PAT does not exist');
    }
    
    /**
     * @description Test hasPAT with default principal
     */
    @isTest
    static void testHasPAT_DefaultPrincipal() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'GitHub.Principal.token' => 'ghp_test'
        };
        
        Test.startTest();
        Boolean hasPat = ExternalCredentialService.hasPAT('GitHub');
        Test.stopTest();
        
        System.assertEquals(true, hasPat, 'Should check with default principal');
    }
    
    /**
     * @description Test getCredentialValue with test override
     */
    @isTest
    static void testGetCredentialValue() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'MyCredential.MyPrincipal.api_key' => 'key123'
        };
        
        Test.startTest();
        String value = ExternalCredentialService.getCredentialValue('MyCredential', 'MyPrincipal', 'api_key');
        Test.stopTest();
        
        System.assertEquals('key123', value, 'Should return the credential value');
    }
    
    /**
     * @description Test getCredentialValue returns null when not found
     */
    @isTest
    static void testGetCredentialValue_NotFound() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>();
        
        Test.startTest();
        String value = ExternalCredentialService.getCredentialValue('MyCredential', 'MyPrincipal', 'nonexistent');
        Test.stopTest();
        
        System.assertEquals(null, value, 'Should return null when not found');
    }
    
    /**
     * @description Test setCredentialValues stores multiple values
     */
    @isTest
    static void testSetCredentialValues() {
        Map<String, String> values = new Map<String, String>{
            'key1' => 'value1',
            'key2' => 'value2'
        };
        
        Test.startTest();
        ExternalCredentialService.setCredentialValues('TestCred', 'TestPrincipal', values);
        String val1 = ExternalCredentialService.getCredentialValue('TestCred', 'TestPrincipal', 'key1');
        String val2 = ExternalCredentialService.getCredentialValue('TestCred', 'TestPrincipal', 'key2');
        Test.stopTest();
        
        System.assertEquals('value1', val1, 'Should store first value');
        System.assertEquals('value2', val2, 'Should store second value');
    }
    
    /**
     * @description Test hasCredentials returns true when credentials exist
     */
    @isTest
    static void testHasCredentials_True() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'TestCred.TestPrincipal.somekey' => 'somevalue'
        };
        
        Test.startTest();
        Boolean hasCreds = ExternalCredentialService.hasCredentials('TestCred', 'TestPrincipal');
        Test.stopTest();
        
        System.assertEquals(true, hasCreds, 'Should return true when credentials exist');
    }
    
    /**
     * @description Test hasCredentials returns false when no credentials
     */
    @isTest
    static void testHasCredentials_False() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>();
        
        Test.startTest();
        Boolean hasCreds = ExternalCredentialService.hasCredentials('TestCred', 'TestPrincipal');
        Test.stopTest();
        
        System.assertEquals(false, hasCreds, 'Should return false when no credentials');
    }
    
    /**
     * @description Test setOAuthClientCredentials
     */
    @isTest
    static void testSetOAuthClientCredentials() {
        Test.startTest();
        ExternalCredentialService.setOAuthClientCredentials('OAuthCred', 'OAuthPrincipal', 'my_client_id', 'my_client_secret');
        String clientId = ExternalCredentialService.getOAuthClientId('OAuthCred', 'OAuthPrincipal');
        String clientSecret = ExternalCredentialService.getOAuthClientSecret('OAuthCred', 'OAuthPrincipal');
        Test.stopTest();
        
        System.assertEquals('my_client_id', clientId, 'Should store client ID');
        System.assertEquals('my_client_secret', clientSecret, 'Should store client secret');
    }
    
    /**
     * @description Test getExternalCredential throws exception when not found (ConnectApi not available in tests)
     */
    @isTest
    static void testGetExternalCredential_NotInTestContext() {
        Test.startTest();
        try {
            ConnectApi.ExternalCredential ec = ExternalCredentialService.getExternalCredential('NonExistent');
            System.assert(false, 'Expected exception in test context');
        } catch (Exception e) {
            // Expected - ConnectApi is not supported in test context
            System.assert(true, 'Expected exception when calling ConnectApi in test');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test createExternalCredential throws exception in test context
     */
    @isTest
    static void testCreateExternalCredential_NotInTestContext() {
        Test.startTest();
        try {
            ConnectApi.ExternalCredential ec = ExternalCredentialService.createExternalCredential(
                'TestCredential',
                'Test Credential',
                'TestPrincipal'
            );
            System.assert(false, 'Expected exception in test context');
        } catch (Exception e) {
            // Expected - ConnectApi is not supported in test context
            System.assert(true, 'Expected exception when calling ConnectApi in test');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test CredentialException class
     */
    @isTest
    static void testCredentialException() {
        Test.startTest();
        ExternalCredentialService.CredentialException ex = new ExternalCredentialService.CredentialException('Test error');
        System.assertEquals('Test error', ex.getMessage(), 'Exception message should match');
        Test.stopTest();
    }
    
    /**
     * @description Test getOAuthClientId directly
     */
    @isTest
    static void testGetOAuthClientId() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'OAuthCred.OAuthPrincipal.client_id' => 'my_oauth_client_id'
        };
        
        Test.startTest();
        String clientId = ExternalCredentialService.getOAuthClientId('OAuthCred', 'OAuthPrincipal');
        Test.stopTest();
        
        System.assertEquals('my_oauth_client_id', clientId, 'Should return client ID');
    }
    
    /**
     * @description Test getOAuthClientSecret directly
     */
    @isTest
    static void testGetOAuthClientSecret() {
        ExternalCredentialService.testCredentialValues = new Map<String, String>{
            'OAuthCred.OAuthPrincipal.client_secret' => 'my_oauth_client_secret'
        };
        
        Test.startTest();
        String clientSecret = ExternalCredentialService.getOAuthClientSecret('OAuthCred', 'OAuthPrincipal');
        Test.stopTest();
        
        System.assertEquals('my_oauth_client_secret', clientSecret, 'Should return client secret');
    }
    
    /**
     * @description Test ensureExternalCredentialExists in test context
     */
    @isTest
    static void testEnsureExternalCredentialExists_TestContext() {
        Test.startTest();
        Boolean result = ExternalCredentialService.ensureExternalCredentialExists('TestCredential', 'TestPrincipal');
        Test.stopTest();
        
        System.assertEquals(false, result, 'Should return false in test context');
    }
    
    /**
     * @description Test getCredentialValue without test override - triggers ConnectApi path
     */
    @isTest
    static void testGetCredentialValue_NoOverride() {
        // Don't set testCredentialValues - this forces the real ConnectApi path
        ExternalCredentialService.testCredentialValues = null;
        
        Test.startTest();
        try {
            ExternalCredentialService.getCredentialValue('NonExistent', 'Principal', 'token');
            System.assert(false, 'Should have thrown exception');
        } catch (ExternalCredentialService.CredentialException e) {
            System.assert(e.getMessage().contains('Failed to retrieve'), 'Should have credential error');
        } catch (Exception e) {
            // ConnectApi throws various exceptions in test context
            System.assert(true, 'Expected exception from ConnectApi');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test hasCredentials without test override - triggers ConnectApi path
     */
    @isTest
    static void testHasCredentials_NoOverride() {
        ExternalCredentialService.testCredentialValues = null;
        
        Test.startTest();
        // This should return false when ConnectApi throws
        Boolean result = ExternalCredentialService.hasCredentials('NonExistent', 'Principal');
        Test.stopTest();
        
        System.assertEquals(false, result, 'Should return false when credentials cannot be accessed');
    }
}
