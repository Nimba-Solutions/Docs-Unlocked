/**
 * @description Service class for handling OAuth client credentials flow.
 * Retrieves client credentials from External Credentials and exchanges them for access tokens.
 */
public class OAuthClientCredentialsService {
    
    public class AuthException extends Exception {}
    
    // Test-visible override for unit tests (ConnectApi cannot be mocked)
    @TestVisible
    private static String testAccessToken;
    
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
        // Allow tests to bypass ConnectApi
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
        
        // Get client credentials from the External Credential
        ConnectApi.ExternalCredential extCred = ConnectApi.NamedCredentials.getExternalCredential(externalCredentialName);
        
        String clientId;
        String clientSecret;
        
        // Find the specified principal and get its credentials
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
                            clientId = credValue.value;
                        } else if (key == 'client_secret') {
                            clientSecret = credValue.value;
                        }
                    }
                }
                break;
            }
        }
        
        if (String.isBlank(clientId) || String.isBlank(clientSecret)) {
            throw new AuthException('OAuth credentials not configured. Please ensure the External Credential "' + 
                externalCredentialName + '" has client_id and client_secret values set for principal "' + principalName + '".');
        }
        
        // Build and send token request
        HttpRequest req = new HttpRequest();
        req.setEndpoint(tokenEndpointUrl);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setBody(
            'grant_type=client_credentials' +
            '&client_id=' + EncodingUtil.urlEncode(clientId, 'UTF-8') +
            '&client_secret=' + EncodingUtil.urlEncode(clientSecret, 'UTF-8')
        );
        req.setTimeout(30000);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            Map<String, Object> tokenResponse = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            String accessToken = (String) tokenResponse.get('access_token');
            if (String.isBlank(accessToken)) {
                throw new AuthException('Token response did not contain an access_token');
            }
            return accessToken;
        } else {
            throw new AuthException('Failed to get access token: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
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
        // Allow tests to bypass ConnectApi
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
        
        // Get client credentials from the External Credential
        ConnectApi.ExternalCredential extCred = ConnectApi.NamedCredentials.getExternalCredential(externalCredentialName);
        
        String clientId;
        String clientSecret;
        
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
                            clientId = credValue.value;
                        } else if (key == 'client_secret') {
                            clientSecret = credValue.value;
                        }
                    }
                }
                break;
            }
        }
        
        if (String.isBlank(clientId) || String.isBlank(clientSecret)) {
            throw new AuthException('OAuth credentials not configured. Please ensure the External Credential "' + 
                externalCredentialName + '" has client_id and client_secret values set for principal "' + principalName + '".');
        }
        
        // Build request body with additional params
        String body = 'grant_type=client_credentials' +
            '&client_id=' + EncodingUtil.urlEncode(clientId, 'UTF-8') +
            '&client_secret=' + EncodingUtil.urlEncode(clientSecret, 'UTF-8');
        
        if (additionalParams != null) {
            for (String paramKey : additionalParams.keySet()) {
                body += '&' + EncodingUtil.urlEncode(paramKey, 'UTF-8') + '=' + 
                    EncodingUtil.urlEncode(additionalParams.get(paramKey), 'UTF-8');
            }
        }
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(tokenEndpointUrl);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.setBody(body);
        req.setTimeout(30000);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            Map<String, Object> tokenResponse = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            String accessToken = (String) tokenResponse.get('access_token');
            if (String.isBlank(accessToken)) {
                throw new AuthException('Token response did not contain an access_token');
            }
            return accessToken;
        } else {
            throw new AuthException('Failed to get access token: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
    }
}
