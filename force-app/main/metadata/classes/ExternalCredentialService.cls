/**
 * @description Service class for managing External Credentials via ConnectApi.
 * Provides generic methods for storing and retrieving credential values,
 * as well as specific helpers for common auth patterns (PAT, OAuth, etc.).
 */
public class ExternalCredentialService {
    
    public class CredentialException extends Exception {}
    
    // Test-visible override for unit tests (ConnectApi cannot be mocked)
    @TestVisible
    private static Map<String, String> testCredentialValues;
    
    // =========================================================================
    // GENERIC CREDENTIAL OPERATIONS
    // =========================================================================
    
    /**
     * @description Retrieves an external credential by its developer name
     * @param developerName The developer name of the external credential
     * @return ConnectApi.ExternalCredential The fetched external credential
     */
    public static ConnectApi.ExternalCredential getExternalCredential(String developerName) {
        return ConnectApi.NamedCredentials.getExternalCredential(developerName);
    }
    
    /**
     * @description Gets a specific credential value from an external credential
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @param credentialKey The key of the credential value to retrieve
     * @return String The credential value, or null if not found
     */
    public static String getCredentialValue(String externalCredentialName, String principalName, String credentialKey) {
        // Allow tests to bypass ConnectApi
        if (Test.isRunningTest() && testCredentialValues != null) {
            String key = externalCredentialName + '.' + principalName + '.' + credentialKey;
            return testCredentialValues.get(key);
        }
        
        try {
            ConnectApi.ExternalCredential extCred = ConnectApi.NamedCredentials.getExternalCredential(externalCredentialName);
            
            for (ConnectApi.ExternalCredentialPrincipal principal : extCred.principals) {
                if (principal.principalName == principalName) {
                    ConnectApi.Credential cred = ConnectApi.NamedCredentials.getCredential(
                        externalCredentialName,
                        principal.principalName,
                        ConnectApi.CredentialPrincipalType.NamedPrincipal
                    );
                    
                    if (cred.credentials != null && cred.credentials.containsKey(credentialKey)) {
                        return cred.credentials.get(credentialKey).value;
                    }
                }
            }
            
            return null;
        } catch (Exception e) {
            throw new CredentialException('Failed to retrieve credential value: ' + e.getMessage());
        }
    }
    
    /**
     * @description Stores credential values in an external credential (creates or updates)
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @param credentialValues Map of key-value pairs to store
     */
    public static void setCredentialValues(String externalCredentialName, String principalName, Map<String, String> credentialValues) {
        // Allow tests to bypass ConnectApi
        if (Test.isRunningTest()) {
            if (testCredentialValues == null) {
                testCredentialValues = new Map<String, String>();
            }
            for (String key : credentialValues.keySet()) {
                String fullKey = externalCredentialName + '.' + principalName + '.' + key;
                testCredentialValues.put(fullKey, credentialValues.get(key));
            }
            return;
        }
        
        ConnectApi.CredentialInput credInput = new ConnectApi.CredentialInput();
        credInput.authenticationProtocol = ConnectApi.CredentialAuthenticationProtocol.Custom;
        credInput.externalCredential = externalCredentialName;
        credInput.principalName = principalName;
        credInput.principalType = ConnectApi.CredentialPrincipalType.NamedPrincipal;
        
        credInput.credentials = new Map<String, ConnectApi.CredentialValueInput>();
        for (String key : credentialValues.keySet()) {
            ConnectApi.CredentialValueInput valueInput = new ConnectApi.CredentialValueInput();
            valueInput.value = credentialValues.get(key);
            valueInput.encrypted = false;
            credInput.credentials.put(key, valueInput);
        }
        
        try {
            // Try to update first
            ConnectApi.NamedCredentials.updateCredential(credInput);
        } catch (ConnectApi.ConnectApiException e) {
            // If update fails, try to create
            if (e.getMessage().contains('NOT_FOUND') || e.getMessage().contains('does not exist')) {
                ConnectApi.NamedCredentials.createCredential(credInput);
            } else {
                throw new CredentialException('Failed to set credential values: ' + e.getMessage());
            }
        }
    }
    
    /**
     * @description Checks if credential values exist for a given external credential
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @return Boolean True if credentials exist
     */
    public static Boolean hasCredentials(String externalCredentialName, String principalName) {
        // Allow tests to bypass ConnectApi
        if (Test.isRunningTest() && testCredentialValues != null) {
            for (String key : testCredentialValues.keySet()) {
                if (key.startsWith(externalCredentialName + '.' + principalName + '.')) {
                    return true;
                }
            }
            return false;
        }
        
        try {
            ConnectApi.ExternalCredential extCred = ConnectApi.NamedCredentials.getExternalCredential(externalCredentialName);
            
            for (ConnectApi.ExternalCredentialPrincipal principal : extCred.principals) {
                if (principal.principalName == principalName) {
                    ConnectApi.Credential cred = ConnectApi.NamedCredentials.getCredential(
                        externalCredentialName,
                        principal.principalName,
                        ConnectApi.CredentialPrincipalType.NamedPrincipal
                    );
                    return cred.credentials != null && !cred.credentials.isEmpty();
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }
    
    // =========================================================================
    // PAT (PERSONAL ACCESS TOKEN) HELPERS
    // =========================================================================
    
    /**
     * @description Gets a PAT stored in an external credential
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal (defaults to 'Principal')
     * @return String The PAT value
     */
    public static String getPAT(String externalCredentialName, String principalName) {
        return getCredentialValue(externalCredentialName, principalName, 'token');
    }
    
    /**
     * @description Gets a PAT using default principal name
     * @param externalCredentialName The name of the external credential
     * @return String The PAT value
     */
    public static String getPAT(String externalCredentialName) {
        return getPAT(externalCredentialName, 'Principal');
    }
    
    /**
     * @description Stores a PAT in an external credential
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @param token The PAT value to store
     */
    public static void setPAT(String externalCredentialName, String principalName, String token) {
        setCredentialValues(externalCredentialName, principalName, new Map<String, String>{
            'token' => token
        });
    }
    
    /**
     * @description Stores a PAT using default principal name
     * @param externalCredentialName The name of the external credential
     * @param token The PAT value to store
     */
    public static void setPAT(String externalCredentialName, String token) {
        setPAT(externalCredentialName, 'Principal', token);
    }
    
    /**
     * @description Checks if a PAT is configured
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @return Boolean True if a PAT is configured
     */
    public static Boolean hasPAT(String externalCredentialName, String principalName) {
        String pat = getPAT(externalCredentialName, principalName);
        return String.isNotBlank(pat);
    }
    
    /**
     * @description Checks if a PAT is configured using default principal
     * @param externalCredentialName The name of the external credential
     * @return Boolean True if a PAT is configured
     */
    public static Boolean hasPAT(String externalCredentialName) {
        return hasPAT(externalCredentialName, 'Principal');
    }
    
    // =========================================================================
    // OAUTH CLIENT CREDENTIALS HELPERS
    // =========================================================================
    
    /**
     * @description Stores OAuth client credentials
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @param clientId The OAuth client ID
     * @param clientSecret The OAuth client secret
     */
    public static void setOAuthClientCredentials(String externalCredentialName, String principalName, String clientId, String clientSecret) {
        setCredentialValues(externalCredentialName, principalName, new Map<String, String>{
            'client_id' => clientId,
            'client_secret' => clientSecret
        });
    }
    
    /**
     * @description Gets OAuth client ID
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @return String The client ID
     */
    public static String getOAuthClientId(String externalCredentialName, String principalName) {
        return getCredentialValue(externalCredentialName, principalName, 'client_id');
    }
    
    /**
     * @description Gets OAuth client secret
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @return String The client secret
     */
    public static String getOAuthClientSecret(String externalCredentialName, String principalName) {
        return getCredentialValue(externalCredentialName, principalName, 'client_secret');
    }
    
    // =========================================================================
    // EXTERNAL CREDENTIAL CREATION (for setup/deployment)
    // =========================================================================
    
    /**
     * @description Creates a new external credential with a named principal
     * @param developerName The developer name for the new external credential
     * @param masterLabel The label for the external credential
     * @param principalName The name of the principal to create
     * @return ConnectApi.ExternalCredential The created external credential
     */
    public static ConnectApi.ExternalCredential createExternalCredential(String developerName, String masterLabel, String principalName) {
        ConnectApi.ExternalCredentialInput externalCredentialInput = new ConnectApi.ExternalCredentialInput();
        
        externalCredentialInput.developerName = developerName;
        externalCredentialInput.masterLabel = masterLabel;
        externalCredentialInput.authenticationProtocol = ConnectApi.CredentialAuthenticationProtocol.Custom;
        
        externalCredentialInput.principals = new List<ConnectApi.ExternalCredentialPrincipalInput>();
        
        ConnectApi.ExternalCredentialPrincipalInput principal = new ConnectApi.ExternalCredentialPrincipalInput();
        principal.principalName = principalName;
        principal.principalType = ConnectApi.CredentialPrincipalType.NamedPrincipal;
        principal.sequenceNumber = 1;
        externalCredentialInput.principals.add(principal);
        
        return ConnectApi.NamedCredentials.createExternalCredential(externalCredentialInput);
    }
}
