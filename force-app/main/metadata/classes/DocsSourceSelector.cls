/**
 * @description Selector class for Docs_Source__mdt custom metadata type.
 * Runs WITHOUT SHARING to allow Guest Users to read doc source configurations
 * without requiring "View All" permissions on the metadata type.
 */
public without sharing class DocsSourceSelector {
    
    /**
     * @description Gets a single active doc source by developer name
     * @param developerName The DeveloperName of the Docs_Source__mdt record
     * @return Docs_Source__mdt The matching record, or null if not found
     */
    public static Docs_Source__mdt getByDeveloperName(String developerName) {
        List<Docs_Source__mdt> sources = [
            SELECT DeveloperName, MasterLabel, Credential_Name__c, Repository_Owner__c, Repository_Name__c,
                   Content_Path__c, Default_Ref__c, Is_Active__c, Description__c,
                   Allow_Version_Switching__c, Provider__c
            FROM Docs_Source__mdt
            WHERE DeveloperName = :developerName
            AND Is_Active__c = true
            LIMIT 1
        ];
        
        return sources.isEmpty() ? null : sources[0];
    }
    
    /**
     * @description Gets all active doc sources ordered by label
     * @return List<Docs_Source__mdt> List of active doc sources
     */
    public static List<Docs_Source__mdt> getAllActive() {
        return [
            SELECT DeveloperName, MasterLabel, Credential_Name__c, Repository_Owner__c, Repository_Name__c,
                   Content_Path__c, Default_Ref__c, Is_Active__c, Description__c,
                   Allow_Version_Switching__c, Provider__c
            FROM Docs_Source__mdt
            WHERE Is_Active__c = true
            ORDER BY MasterLabel ASC
        ];
    }
    
    /**
     * @description Gets all doc sources (active and inactive) ordered by label
     * @return List<Docs_Source__mdt> List of all doc sources
     */
    public static List<Docs_Source__mdt> getAll() {
        return [
            SELECT DeveloperName, MasterLabel, Credential_Name__c, Provider__c, 
                   Repository_Owner__c, Repository_Name__c, Content_Path__c, Default_Ref__c, 
                   Is_Active__c, Allow_Version_Switching__c, Description__c
            FROM Docs_Source__mdt
            ORDER BY MasterLabel ASC
        ];
    }
}
