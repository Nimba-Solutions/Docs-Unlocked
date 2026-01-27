/**
 * @description Test class for OAuthClientCredentialsService
 * Note: ConnectApi methods cannot be mocked in unit tests.
 * These tests verify code paths and exception handling.
 */
@isTest
private class OAuthClientCredentialsServiceTest {
    
    /**
     * @description Test getAccessToken using testAccessToken override
     */
    @isTest
    static void testGetAccessToken_WithTestOverride() {
        OAuthClientCredentialsService.testAccessToken = 'mock-token-12345';
        
        Test.startTest();
        String token = OAuthClientCredentialsService.getAccessToken(
            'MyExternalCredential',
            'https://auth.example.com/oauth/token'
        );
        Test.stopTest();
        
        System.assertEquals('mock-token-12345', token, 'Should return the test token');
    }
    
    /**
     * @description Test getAccessToken with custom principal using override
     */
    @isTest
    static void testGetAccessToken_CustomPrincipal_WithTestOverride() {
        OAuthClientCredentialsService.testAccessToken = 'custom-principal-token';
        
        Test.startTest();
        String token = OAuthClientCredentialsService.getAccessToken(
            'MyExternalCredential',
            'https://auth.example.com/oauth/token',
            'CustomPrincipal'
        );
        Test.stopTest();
        
        System.assertEquals('custom-principal-token', token, 'Should return the test token with custom principal');
    }
    
    /**
     * @description Test getAccessToken with additional params using override
     */
    @isTest
    static void testGetAccessToken_AdditionalParams_WithTestOverride() {
        OAuthClientCredentialsService.testAccessToken = 'scoped-token';
        
        Map<String, String> additionalParams = new Map<String, String>{
            'scope' => 'read write',
            'audience' => 'https://api.example.com'
        };
        
        Test.startTest();
        String token = OAuthClientCredentialsService.getAccessToken(
            'MyExternalCredential',
            'https://auth.example.com/oauth/token',
            'Client',
            additionalParams
        );
        Test.stopTest();
        
        System.assertEquals('scoped-token', token, 'Should return the test token with additional params');
    }
    
    /**
     * @description Test getAccessToken without override - should fail in test context
     * Will throw exception due to ConnectApi not being supported in tests
     */
    @isTest
    static void testGetAccessToken_NoOverride_ConnectApiException() {
        // Ensure no test override is set
        OAuthClientCredentialsService.testAccessToken = null;
        
        Test.startTest();
        try {
            OAuthClientCredentialsService.getAccessToken(
                'TestCredential',
                'https://auth.example.com/oauth/token'
            );
            System.assert(false, 'Expected exception in test context');
        } catch (Exception e) {
            // Expected - ConnectApi is not supported in test context
            System.assert(true, 'Expected exception when calling ConnectApi in test');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getAccessToken with blank external credential name
     */
    @isTest
    static void testGetAccessToken_BlankExternalCredential() {
        OAuthClientCredentialsService.testAccessToken = null;
        
        Test.startTest();
        try {
            OAuthClientCredentialsService.getAccessToken(
                '',
                'https://auth.example.com/oauth/token'
            );
            System.assert(false, 'Expected AuthException for blank external credential name');
        } catch (OAuthClientCredentialsService.AuthException e) {
            System.assert(e.getMessage().contains('External Credential name is required'), 
                'Should throw AuthException for blank external credential name');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getAccessToken with blank token URL
     */
    @isTest
    static void testGetAccessToken_BlankTokenUrl() {
        OAuthClientCredentialsService.testAccessToken = null;
        
        Test.startTest();
        try {
            OAuthClientCredentialsService.getAccessToken(
                'MyCredential',
                ''
            );
            System.assert(false, 'Expected AuthException for blank token URL');
        } catch (OAuthClientCredentialsService.AuthException e) {
            System.assert(e.getMessage().contains('Token endpoint URL is required'), 
                'Should throw AuthException for blank token URL');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test AuthException class
     */
    @isTest
    static void testAuthException() {
        Test.startTest();
        OAuthClientCredentialsService.AuthException ex = new OAuthClientCredentialsService.AuthException('Test error message');
        System.assertEquals('Test error message', ex.getMessage(), 'Exception message should match');
        Test.stopTest();
    }
    
    /**
     * @description Test AuthException with chained exception
     */
    @isTest
    static void testAuthException_Chained() {
        Test.startTest();
        Exception cause = new System.CalloutException('Original error');
        OAuthClientCredentialsService.AuthException ex = new OAuthClientCredentialsService.AuthException('Wrapped error', cause);
        System.assertEquals('Wrapped error', ex.getMessage(), 'Exception message should match');
        Test.stopTest();
    }
}
