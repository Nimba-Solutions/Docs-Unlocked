/**
 * @description Service class for managing External Credentials via ConnectApi.
 * Provides methods to create, update, and retrieve external credential values
 * for OAuth authentication flows.
 */
public class ExternalCredentialService {

    /**
     * @description Retrieves an external credential by its developer name
     * @param developerName The developer name of the external credential
     * @return ConnectApi.ExternalCredential The fetched external credential
     */
    public static ConnectApi.ExternalCredential getExternalCredential(String developerName) {
        ConnectApi.ExternalCredential fetchedEC = ConnectApi.NamedCredentials.getExternalCredential(developerName);
        return fetchedEC;
    }
    
    /**
     * @description Creates a new external credential (used primarily for test coverage)
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
        
        ConnectApi.ExternalCredentialPrincipalInput principalOne = new ConnectApi.ExternalCredentialPrincipalInput();
        principalOne.principalName = principalName;
        principalOne.principalType = ConnectApi.CredentialPrincipalType.NamedPrincipal;
        principalOne.sequenceNumber = 1;
        externalCredentialInput.principals.add(principalOne);
        
        ConnectApi.ExternalCredential externalCredential = ConnectApi.NamedCredentials.createExternalCredential(externalCredentialInput);
        return externalCredential;
    }
    
    /**
     * @description Creates credential values for API authentication
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @param clientId The OAuth client ID
     * @param clientSecret The OAuth client secret
     */
    public static void createCredentialValues(String externalCredentialName, String principalName, String clientId, String clientSecret) {
        ConnectApi.CredentialInput credValues = buildCredentialInput(externalCredentialName, principalName, clientId, clientSecret);
        ConnectApi.Credential credential = ConnectApi.NamedCredentials.createCredential(credValues);
    }
    
    /**
     * @description Updates credential values for API authentication
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @param clientId The OAuth client ID
     * @param clientSecret The OAuth client secret
     */
    public static void updateCredentialValues(String externalCredentialName, String principalName, String clientId, String clientSecret) {
        ConnectApi.CredentialInput credValues = buildCredentialInput(externalCredentialName, principalName, clientId, clientSecret);
        ConnectApi.NamedCredentials.updateCredential(credValues);
    }
    
    /**
     * @description Builds a CredentialInput object with credential parameters
     * @param externalCredentialName The name of the external credential
     * @param principalName The name of the principal
     * @param clientId The OAuth client ID
     * @param clientSecret The OAuth client secret
     * @return ConnectApi.CredentialInput The built credential input
     */
    private static ConnectApi.CredentialInput buildCredentialInput(String externalCredentialName, String principalName, String clientId, String clientSecret) {
        ConnectApi.CredentialInput credValues = new ConnectApi.CredentialInput();
        credValues.authenticationProtocol = ConnectApi.CredentialAuthenticationProtocol.Custom;
        credValues.externalCredential = externalCredentialName;
        credValues.principalName = principalName;
        credValues.principalType = ConnectApi.CredentialPrincipalType.NamedPrincipal;
        credValues.credentials = new Map<String, ConnectApi.CredentialValueInput>{
            'client_id' => buildCredentialValue(clientId),
            'client_secret' => buildCredentialValue(clientSecret)
        };
        return credValues;
    }

    /**
     * @description Builds a CredentialValueInput object
     * @param value The credential value
     * @return ConnectApi.CredentialValueInput The built credential value input
     */
    private static ConnectApi.CredentialValueInput buildCredentialValue(String value) {
        ConnectApi.CredentialValueInput credentialValue = new ConnectApi.CredentialValueInput();
        credentialValue.value = value;
        credentialValue.encrypted = false;
        return credentialValue;
    }
}
