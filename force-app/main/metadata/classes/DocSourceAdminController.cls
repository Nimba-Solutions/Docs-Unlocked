/**
 * @description Controller for the Docs Unlocked admin setup LWC.
 * Provides methods for configuring credentials and managing Doc_Source__c records.
 */
public with sharing class DocSourceAdminController {
    
    // =========================================================================
    // CREDENTIAL MANAGEMENT
    // =========================================================================
    
    /**
     * @description Tests a credential by trying to list repositories
     * @param credentialName The credential name to test
     * @param token The token to test (will be saved temporarily)
     * @return ConnectionTestResult The result of the connection test
     */
    @AuraEnabled
    public static ConnectionTestResult testCredential(String credentialName, String token) {
        ConnectionTestResult result = new ConnectionTestResult();
        
        try {
            if (String.isBlank(credentialName)) {
                result.success = false;
                result.message = 'Credential name is required';
                return result;
            }
            if (String.isBlank(token)) {
                result.success = false;
                result.message = 'Token is required';
                return result;
            }
            
            // Save the token first
            String extCredName = 'GitHub_' + credentialName;
            ExternalCredentialService.setPAT(extCredName, 'Principal', token);
            
            // Try to list repos - this validates the token works
            List<GitHubService.Repository> repos = GitHubService.listRepositoriesWithCredential(extCredName);
            result.success = true;
            result.message = 'Connected! Found ' + repos.size() + ' repositories.';
            result.repoCount = repos.size();
        } catch (Exception e) {
            result.success = false;
            result.message = 'Failed: ' + e.getMessage();
        }
        
        return result;
    }
    
    /**
     * @description Gets repositories for a specific credential
     * @param credentialName The credential name
     * @return List of repositories
     */
    @AuraEnabled
    public static List<GitHubService.Repository> getRepositoriesForCredential(String credentialName) {
        try {
            String extCredName = 'GitHub_' + credentialName;
            return GitHubService.listRepositoriesWithCredential(extCredName);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to load repositories: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets branches for a specific credential and repo
     * @param credentialName The credential name
     * @param owner The repo owner
     * @param repo The repo name
     * @return List of branches
     */
    @AuraEnabled
    public static List<GitHubService.Branch> getBranchesForCredential(String credentialName, String owner, String repo) {
        try {
            String extCredName = 'GitHub_' + credentialName;
            return GitHubService.getBranchesWithCredential(extCredName, owner, repo);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to load branches: ' + e.getMessage());
        }
    }
    
    // =========================================================================
    // DOC SOURCE MANAGEMENT
    // =========================================================================
    
    /**
     * @description Gets all Doc Source records (active and inactive)
     * @return List<DocSourceWrapper> List of doc sources
     */
    @AuraEnabled(cacheable=true)
    public static List<DocSourceWrapper> getDocSources() {
        try {
            List<Doc_Source__c> sources = [
                SELECT Id, Name, App_Identifier__c, Credential_Name__c, Provider__c, 
                       Repository_Owner__c, Repository_Name__c, Content_Path__c, Default_Ref__c, 
                       Is_Active__c, Allow_Version_Switching__c, Description__c,
                       CreatedDate, LastModifiedDate
                FROM Doc_Source__c
                ORDER BY Name ASC
            ];
            
            List<DocSourceWrapper> wrappers = new List<DocSourceWrapper>();
            for (Doc_Source__c source : sources) {
                wrappers.add(new DocSourceWrapper(source));
            }
            
            return wrappers;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch doc sources: ' + e.getMessage());
        }
    }
    
    /**
     * @description Saves a Doc Source record (insert or update)
     * @param sourceData The doc source data
     * @return DocSourceWrapper The saved doc source
     */
    @AuraEnabled
    public static DocSourceWrapper saveDocSource(Map<String, Object> sourceData) {
        try {
            Doc_Source__c source = mapToDocSource(sourceData);
            upsert source;
            return requeryAndWrap(source.Id);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to save doc source: ' + e.getMessage());
        }
    }
    
    /**
     * @description Saves a Doc Source record with a token
     * @param sourceData The doc source data
     * @param token The GitHub token to save (can be null/blank if not updating token)
     * @return DocSourceWrapper The saved doc source
     */
    @AuraEnabled
    public static DocSourceWrapper saveDocSourceWithToken(Map<String, Object> sourceData, String token) {
        try {
            String credentialName = (String) sourceData.get('credentialName');
            
            // Save the token if provided
            if (String.isNotBlank(credentialName) && String.isNotBlank(token)) {
                String extCredName = 'GitHub_' + credentialName;
                ExternalCredentialService.setPAT(extCredName, 'Principal', token);
            }
            
            // Save the doc source
            Doc_Source__c source = mapToDocSource(sourceData);
            upsert source;
            return requeryAndWrap(source.Id);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to save doc source: ' + e.getMessage());
        }
    }
    
    /**
     * @description Maps sourceData to Doc_Source__c
     */
    private static Doc_Source__c mapToDocSource(Map<String, Object> sourceData) {
        Doc_Source__c source;
        
        String recordId = (String) sourceData.get('id');
        if (String.isNotBlank(recordId)) {
            source = [SELECT Id FROM Doc_Source__c WHERE Id = :recordId LIMIT 1];
        } else {
            source = new Doc_Source__c();
        }
        
        source.Name = (String) sourceData.get('name');
        source.App_Identifier__c = (String) sourceData.get('appIdentifier');
        source.Credential_Name__c = (String) sourceData.get('credentialName');
        source.Provider__c = (String) sourceData.get('provider');
        source.Repository_Owner__c = (String) sourceData.get('repositoryOwner');
        source.Repository_Name__c = (String) sourceData.get('repositoryName');
        source.Content_Path__c = (String) sourceData.get('contentPath');
        source.Default_Ref__c = (String) sourceData.get('defaultRef');
        source.Is_Active__c = sourceData.get('isActive') == true;
        source.Allow_Version_Switching__c = sourceData.get('allowVersionSwitching') == true;
        source.Description__c = (String) sourceData.get('description');
        
        return source;
    }
    
    /**
     * @description Re-queries and wraps a Doc_Source__c
     */
    private static DocSourceWrapper requeryAndWrap(Id sourceId) {
        Doc_Source__c source = [
            SELECT Id, Name, App_Identifier__c, Credential_Name__c, Provider__c, 
                   Repository_Owner__c, Repository_Name__c, Content_Path__c, Default_Ref__c, 
                   Is_Active__c, Allow_Version_Switching__c, Description__c,
                   CreatedDate, LastModifiedDate
            FROM Doc_Source__c
            WHERE Id = :sourceId
        ];
        return new DocSourceWrapper(source);
    }
    
    /**
     * @description Deletes a Doc Source record
     * @param recordId The record ID to delete
     */
    @AuraEnabled
    public static void deleteDocSource(Id recordId) {
        try {
            delete [SELECT Id FROM Doc_Source__c WHERE Id = :recordId];
        } catch (Exception e) {
            throw new AuraHandledException('Failed to delete doc source: ' + e.getMessage());
        }
    }
    
    /**
     * @description Validates a doc source configuration by testing the connection
     * @param sourceData The doc source data to validate
     * @return ValidationResult The validation result
     */
    @AuraEnabled
    public static ValidationResult validateDocSource(Map<String, Object> sourceData) {
        ValidationResult result = new ValidationResult();
        
        try {
            String provider = (String) sourceData.get('provider');
            String credentialName = (String) sourceData.get('credentialName');
            String owner = (String) sourceData.get('repositoryOwner');
            String repo = (String) sourceData.get('repositoryName');
            String contentPath = (String) sourceData.get('contentPath');
            String defaultRef = (String) sourceData.get('defaultRef');
            
            if (provider != 'GitHub') {
                result.valid = false;
                result.message = 'Only GitHub is currently supported.';
                return result;
            }
            
            if (String.isBlank(credentialName)) {
                result.valid = false;
                result.message = 'Credential name is required.';
                return result;
            }
            
            String extCredName = 'GitHub_' + credentialName;
            
            // Test that we can access the repo
            List<GitHubService.Branch> branches = GitHubService.getBranchesWithCredential(extCredName, owner, repo);
            
            // Verify the default ref exists
            Boolean refExists = false;
            for (GitHubService.Branch branch : branches) {
                if (branch.name == defaultRef) {
                    refExists = true;
                    break;
                }
            }
            
            if (!refExists) {
                // Check tags
                List<GitHubService.Branch> tags = GitHubService.getTagsWithCredential(extCredName, owner, repo);
                for (GitHubService.Branch tag : tags) {
                    if (tag.name == defaultRef) {
                        refExists = true;
                        break;
                    }
                }
            }
            
            if (!refExists) {
                result.valid = false;
                result.message = 'Default ref "' + defaultRef + '" not found. Available branches: ' + 
                    String.join(getBranchNames(branches), ', ');
                return result;
            }
            
            // Test that we can access the content path
            if (String.isNotBlank(contentPath)) {
                try {
                    List<GitHubService.TreeItem> tree = GitHubService.getTreeWithCredential(extCredName, owner, repo, defaultRef, true);
                    List<GitHubService.TreeItem> filtered = GitHubService.filterTreeByPath(tree, contentPath);
                    List<GitHubService.TreeItem> mdFiles = GitHubService.filterMarkdownFiles(filtered);
                    
                    result.valid = true;
                    result.message = 'Valid! Found ' + mdFiles.size() + ' markdown files in ' + contentPath;
                    result.fileCount = mdFiles.size();
                } catch (Exception e) {
                    result.valid = false;
                    result.message = 'Content path "' + contentPath + '" not accessible: ' + e.getMessage();
                }
            } else {
                result.valid = true;
                result.message = 'Repository accessible. Branch count: ' + branches.size();
            }
            
        } catch (Exception e) {
            result.valid = false;
            result.message = 'Validation failed: ' + e.getMessage();
        }
        
        return result;
    }
    
    /**
     * @description Helper to get branch names
     */
    private static List<String> getBranchNames(List<GitHubService.Branch> branches) {
        List<String> names = new List<String>();
        for (GitHubService.Branch b : branches) {
            names.add(b.name);
        }
        return names;
    }
    
    // =========================================================================
    // WRAPPER CLASSES
    // =========================================================================
    
    /**
     * @description Wrapper for connection test result
     */
    public class ConnectionTestResult {
        @AuraEnabled public Boolean success { get; set; }
        @AuraEnabled public String message { get; set; }
        @AuraEnabled public Integer repoCount { get; set; }
    }
    
    /**
     * @description Wrapper for validation result
     */
    public class ValidationResult {
        @AuraEnabled public Boolean valid { get; set; }
        @AuraEnabled public String message { get; set; }
        @AuraEnabled public Integer fileCount { get; set; }
    }
    
    /**
     * @description Wrapper for Doc_Source__c records
     */
    public class DocSourceWrapper {
        @AuraEnabled public Id id { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String appIdentifier { get; set; }
        @AuraEnabled public String credentialName { get; set; }
        @AuraEnabled public String provider { get; set; }
        @AuraEnabled public String repositoryOwner { get; set; }
        @AuraEnabled public String repositoryName { get; set; }
        @AuraEnabled public String contentPath { get; set; }
        @AuraEnabled public String defaultRef { get; set; }
        @AuraEnabled public Boolean isActive { get; set; }
        @AuraEnabled public Boolean allowVersionSwitching { get; set; }
        @AuraEnabled public String description { get; set; }
        @AuraEnabled public Datetime createdDate { get; set; }
        @AuraEnabled public Datetime lastModifiedDate { get; set; }
        
        public DocSourceWrapper() {}
        
        public DocSourceWrapper(Doc_Source__c source) {
            this.id = source.Id;
            this.name = source.Name;
            this.appIdentifier = source.App_Identifier__c;
            this.credentialName = source.Credential_Name__c;
            this.provider = source.Provider__c;
            this.repositoryOwner = source.Repository_Owner__c;
            this.repositoryName = source.Repository_Name__c;
            this.contentPath = source.Content_Path__c;
            this.defaultRef = source.Default_Ref__c;
            this.isActive = source.Is_Active__c;
            this.allowVersionSwitching = source.Allow_Version_Switching__c;
            this.description = source.Description__c;
            this.createdDate = source.CreatedDate;
            this.lastModifiedDate = source.LastModifiedDate;
        }
    }
}
