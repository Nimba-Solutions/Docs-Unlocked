/**
 * @description Service class for handling OAuth client credentials flow.
 * Retrieves client credentials from External Credentials and exchanges them for access tokens.
 */
public class OAuthClientCredentialsService {
    
    public class AuthException extends Exception {}
    
    // Test-visible overrides for unit tests
    @TestVisible
    private static String testAccessToken;
    @TestVisible
    private static String testClientId;
    @TestVisible
    private static String testClientSecret;
    @TestVisible
    private static String testHttpResponse;
    @TestVisible
    private static Integer testHttpStatusCode;
    
    /**
     * @description Gets an OAuth access token using client credentials flow
     * @param externalCredentialName The name of the External Credential containing client_id and client_secret
     * @param tokenEndpointUrl The OAuth token endpoint URL
     * @return String The access token
     */
    public static String getAccessToken(String externalCredentialName, String tokenEndpointUrl) {
        return getAccessToken(externalCredentialName, tokenEndpointUrl, 'Client');
    }
    
    /**
     * @description Gets an OAuth access token using client credentials flow
     * @param externalCredentialName The name of the External Credential containing client_id and client_secret
     * @param tokenEndpointUrl The OAuth token endpoint URL
     * @param principalName The name of the principal within the External Credential (default: 'Client')
     * @return String The access token
     */
    public static String getAccessToken(String externalCredentialName, String tokenEndpointUrl, String principalName) {
        return getAccessToken(externalCredentialName, tokenEndpointUrl, principalName, null);
    }
    
    /**
     * @description Gets an OAuth access token with additional parameters (e.g., scope)
     * @param externalCredentialName The name of the External Credential
     * @param tokenEndpointUrl The OAuth token endpoint URL
     * @param principalName The name of the principal
     * @param additionalParams Map of additional parameters to include in the token request
     * @return String The access token
     */
    public static String getAccessToken(
        String externalCredentialName, 
        String tokenEndpointUrl, 
        String principalName,
        Map<String, String> additionalParams
    ) {
        // Allow tests to bypass entirely
        if (Test.isRunningTest() && testAccessToken != null) {
            return testAccessToken;
        }
        
        if (String.isBlank(externalCredentialName)) {
            throw new AuthException('External Credential name is required');
        }
        if (String.isBlank(tokenEndpointUrl)) {
            throw new AuthException('Token endpoint URL is required');
        }
        if (String.isBlank(principalName)) {
            principalName = 'Client';
        }
        
        // Get client credentials
        String clientId;
        String clientSecret;
        
        if (Test.isRunningTest() && testClientId != null && testClientSecret != null) {
            clientId = testClientId;
            clientSecret = testClientSecret;
        } else {
            Map<String, String> creds = getClientCredentials(externalCredentialName, principalName);
            clientId = creds.get('client_id');
            clientSecret = creds.get('client_secret');
        }
        
        if (String.isBlank(clientId) || String.isBlank(clientSecret)) {
            throw new AuthException('OAuth credentials not configured. Please ensure the External Credential "' + 
                externalCredentialName + '" has client_id and client_secret values set for principal "' + principalName + '".');
        }
        
        // Build and send token request
        return exchangeCredentialsForToken(tokenEndpointUrl, clientId, clientSecret, additionalParams);
    }
    
    /**
     * @description Gets client credentials from External Credential
     * @param externalCredentialName The external credential name
     * @param principalName The principal name
     * @return Map<String, String> containing client_id and client_secret
     */
    @TestVisible
    private static Map<String, String> getClientCredentials(String externalCredentialName, String principalName) {
        Map<String, String> result = new Map<String, String>();
        
        ConnectApi.ExternalCredential extCred = ConnectApi.NamedCredentials.getExternalCredential(externalCredentialName);
        
        for (ConnectApi.ExternalCredentialPrincipal principal : extCred.principals) {
            if (principal.principalName == principalName) {
                ConnectApi.Credential cred = ConnectApi.NamedCredentials.getCredential(
                    externalCredentialName, 
                    principal.principalName, 
                    ConnectApi.CredentialPrincipalType.NamedPrincipal
                );
                
                if (cred.credentials != null) {
                    for (String key : cred.credentials.keySet()) {
                        ConnectApi.CredentialValue credValue = cred.credentials.get(key);
                        if (key == 'client_id') {
                            result.put('client_id', credValue.value);
                        } else if (key == 'client_secret') {
                            result.put('client_secret', credValue.value);
                        }
                    }
                }
                break;
            }
        }
        
        return result;
    }
    
    /**
     * @description Exchanges client credentials for an access token
     * @param tokenEndpointUrl The OAuth token endpoint
     * @param clientId The client ID
     * @param clientSecret The client secret
     * @param additionalParams Optional additional parameters
     * @return String The access token
     */
    @TestVisible
    private static String exchangeCredentialsForToken(
        String tokenEndpointUrl, 
        String clientId, 
        String clientSecret, 
        Map<String, String> additionalParams
    ) {
        // Build request body
        String body = 'grant_type=client_credentials' +
            '&client_id=' + EncodingUtil.urlEncode(clientId, 'UTF-8') +
            '&client_secret=' + EncodingUtil.urlEncode(clientSecret, 'UTF-8');
        
        if (additionalParams != null) {
            for (String paramKey : additionalParams.keySet()) {
                body += '&' + EncodingUtil.urlEncode(paramKey, 'UTF-8') + '=' + 
                    EncodingUtil.urlEncode(additionalParams.get(paramKey), 'UTF-8');
            }
        }
        
        // Test mode with mock response
        if (Test.isRunningTest() && testHttpResponse != null) {
            return parseTokenResponse(testHttpStatusCode != null ? testHttpStatusCode : 200, testHttpResponse);
        }
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(tokenEndpointUrl);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setBody(body);
        req.setTimeout(30000);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        return parseTokenResponse(res.getStatusCode(), res.getBody());
    }
    
    /**
     * @description Parses token response and extracts access token
     * @param statusCode The HTTP status code
     * @param responseBody The response body
     * @return String The access token
     */
    @TestVisible
    private static String parseTokenResponse(Integer statusCode, String responseBody) {
        if (statusCode == 200) {
            Map<String, Object> tokenResponse = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
            String accessToken = (String) tokenResponse.get('access_token');
            if (String.isBlank(accessToken)) {
                throw new AuthException('Token response did not contain an access_token');
            }
            return accessToken;
        } else {
            throw new AuthException('Failed to get access token: ' + statusCode + ' - ' + responseBody);
        }
    }
}
