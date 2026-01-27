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
     * @description Test getAccessToken with mock client credentials and HTTP response
     */
    @isTest
    static void testGetAccessToken_WithMockCredentialsAndHttp() {
        OAuthClientCredentialsService.testClientId = 'test_client_id';
        OAuthClientCredentialsService.testClientSecret = 'test_client_secret';
        OAuthClientCredentialsService.testHttpStatusCode = 200;
        OAuthClientCredentialsService.testHttpResponse = '{"access_token": "oauth_token_123", "token_type": "Bearer"}';
        
        Test.startTest();
        String token = OAuthClientCredentialsService.getAccessToken(
            'MyExternalCredential',
            'https://auth.example.com/oauth/token'
        );
        Test.stopTest();
        
        System.assertEquals('oauth_token_123', token, 'Should return the parsed access token');
    }
    
    /**
     * @description Test getAccessToken with additional params using mock HTTP
     */
    @isTest
    static void testGetAccessToken_AdditionalParamsWithMockHttp() {
        OAuthClientCredentialsService.testClientId = 'test_client_id';
        OAuthClientCredentialsService.testClientSecret = 'test_client_secret';
        OAuthClientCredentialsService.testHttpStatusCode = 200;
        OAuthClientCredentialsService.testHttpResponse = '{"access_token": "scoped_token_456"}';
        
        Map<String, String> additionalParams = new Map<String, String>{
            'scope' => 'api:read api:write'
        };
        
        Test.startTest();
        String token = OAuthClientCredentialsService.getAccessToken(
            'MyExternalCredential',
            'https://auth.example.com/oauth/token',
            'Client',
            additionalParams
        );
        Test.stopTest();
        
        System.assertEquals('scoped_token_456', token, 'Should return the parsed access token');
    }
    
    /**
     * @description Test exchangeCredentialsForToken success
     */
    @isTest
    static void testExchangeCredentialsForToken_Success() {
        OAuthClientCredentialsService.testHttpStatusCode = 200;
        OAuthClientCredentialsService.testHttpResponse = '{"access_token": "exchanged_token", "expires_in": 3600}';
        
        Test.startTest();
        String token = OAuthClientCredentialsService.exchangeCredentialsForToken(
            'https://auth.example.com/oauth/token',
            'my_client_id',
            'my_client_secret',
            null
        );
        Test.stopTest();
        
        System.assertEquals('exchanged_token', token, 'Should return the exchanged token');
    }
    
    /**
     * @description Test exchangeCredentialsForToken with additional params
     */
    @isTest
    static void testExchangeCredentialsForToken_WithParams() {
        OAuthClientCredentialsService.testHttpStatusCode = 200;
        OAuthClientCredentialsService.testHttpResponse = '{"access_token": "param_token"}';
        
        Map<String, String> params = new Map<String, String>{
            'scope' => 'read',
            'audience' => 'https://api.example.com'
        };
        
        Test.startTest();
        String token = OAuthClientCredentialsService.exchangeCredentialsForToken(
            'https://auth.example.com/oauth/token',
            'my_client_id',
            'my_client_secret',
            params
        );
        Test.stopTest();
        
        System.assertEquals('param_token', token, 'Should return the token');
    }
    
    /**
     * @description Test exchangeCredentialsForToken HTTP error
     */
    @isTest
    static void testExchangeCredentialsForToken_HttpError() {
        OAuthClientCredentialsService.testHttpStatusCode = 401;
        OAuthClientCredentialsService.testHttpResponse = '{"error": "invalid_client"}';
        
        Test.startTest();
        try {
            OAuthClientCredentialsService.exchangeCredentialsForToken(
                'https://auth.example.com/oauth/token',
                'bad_client',
                'bad_secret',
                null
            );
            System.assert(false, 'Expected AuthException');
        } catch (OAuthClientCredentialsService.AuthException e) {
            System.assert(e.getMessage().contains('Failed to get access token'), 'Should contain error message');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test parseTokenResponse success
     */
    @isTest
    static void testParseTokenResponse_Success() {
        Test.startTest();
        String token = OAuthClientCredentialsService.parseTokenResponse(200, '{"access_token": "parsed_token"}');
        Test.stopTest();
        
        System.assertEquals('parsed_token', token, 'Should parse the access token');
    }
    
    /**
     * @description Test parseTokenResponse missing token
     */
    @isTest
    static void testParseTokenResponse_MissingToken() {
        Test.startTest();
        try {
            OAuthClientCredentialsService.parseTokenResponse(200, '{"token_type": "Bearer"}');
            System.assert(false, 'Expected AuthException');
        } catch (OAuthClientCredentialsService.AuthException e) {
            System.assert(e.getMessage().contains('did not contain an access_token'), 'Should report missing token');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test parseTokenResponse error status
     */
    @isTest
    static void testParseTokenResponse_ErrorStatus() {
        Test.startTest();
        try {
            OAuthClientCredentialsService.parseTokenResponse(400, '{"error": "invalid_request"}');
            System.assert(false, 'Expected AuthException');
        } catch (OAuthClientCredentialsService.AuthException e) {
            System.assert(e.getMessage().contains('Failed to get access token'), 'Should contain error');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getAccessToken without override - should fail in test context
     * Will throw exception due to ConnectApi not being supported in tests
     */
    @isTest
    static void testGetAccessToken_NoOverride_ConnectApiException() {
        // Ensure no test override is set
        OAuthClientCredentialsService.testAccessToken = null;
        OAuthClientCredentialsService.testClientId = null;
        OAuthClientCredentialsService.testClientSecret = null;
        
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
     * @description Test getAccessToken with blank principal defaults to Client
     */
    @isTest
    static void testGetAccessToken_BlankPrincipal() {
        OAuthClientCredentialsService.testClientId = 'test_id';
        OAuthClientCredentialsService.testClientSecret = 'test_secret';
        OAuthClientCredentialsService.testHttpStatusCode = 200;
        OAuthClientCredentialsService.testHttpResponse = '{"access_token": "default_principal_token"}';
        
        Test.startTest();
        String token = OAuthClientCredentialsService.getAccessToken(
            'MyCredential',
            'https://auth.example.com/oauth/token',
            '',
            null
        );
        Test.stopTest();
        
        System.assertEquals('default_principal_token', token, 'Should work with blank principal');
    }
    
    /**
     * @description Test getAccessToken with missing credentials
     */
    @isTest
    static void testGetAccessToken_MissingCredentials() {
        OAuthClientCredentialsService.testClientId = '';
        OAuthClientCredentialsService.testClientSecret = '';
        
        Test.startTest();
        try {
            OAuthClientCredentialsService.getAccessToken(
                'MyCredential',
                'https://auth.example.com/oauth/token',
                'Client',
                null
            );
            System.assert(false, 'Expected AuthException');
        } catch (OAuthClientCredentialsService.AuthException e) {
            System.assert(e.getMessage().contains('OAuth credentials not configured'), 'Should report missing credentials');
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
    
    /**
     * @description Test exchangeCredentialsForToken with null additional params
     */
    @isTest
    static void testExchangeCredentialsForToken_NullParams() {
        OAuthClientCredentialsService.testHttpStatusCode = 200;
        OAuthClientCredentialsService.testHttpResponse = '{"access_token": "null_params_token"}';
        
        Test.startTest();
        String token = OAuthClientCredentialsService.exchangeCredentialsForToken(
            'https://auth.example.com/oauth/token',
            'client_id',
            'client_secret',
            null
        );
        Test.stopTest();
        
        System.assertEquals('null_params_token', token, 'Should return token');
    }
    
    /**
     * @description Test two-arg getAccessToken (uses default principal)
     */
    @isTest
    static void testGetAccessToken_TwoArg() {
        OAuthClientCredentialsService.testAccessToken = 'two_arg_token';
        
        Test.startTest();
        String token = OAuthClientCredentialsService.getAccessToken(
            'TestCredential',
            'https://auth.example.com/oauth/token'
        );
        Test.stopTest();
        
        System.assertEquals('two_arg_token', token, 'Should return token');
    }
    
    /**
     * @description Test three-arg getAccessToken
     */
    @isTest
    static void testGetAccessToken_ThreeArg() {
        OAuthClientCredentialsService.testAccessToken = 'three_arg_token';
        
        Test.startTest();
        String token = OAuthClientCredentialsService.getAccessToken(
            'TestCredential',
            'https://auth.example.com/oauth/token',
            'CustomPrincipal'
        );
        Test.stopTest();
        
        System.assertEquals('three_arg_token', token, 'Should return token');
    }
}
