/**
 * @description Controller for the Docs Unlocked admin setup LWC.
 * Provides methods for configuring credentials and managing Doc_Source__c records.
 */
public with sharing class DocSourceAdminController {
    
    // =========================================================================
    // CREDENTIAL MANAGEMENT
    // =========================================================================
    
    /**
     * @description Checks if GitHub credentials are configured
     * @return Boolean True if credentials are configured
     */
    @AuraEnabled(cacheable=false)
    public static Boolean isGitHubConfigured() {
        try {
            return GitHubService.isConfigured();
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * @description Saves the GitHub Personal Access Token
     * @param token The GitHub PAT
     */
    @AuraEnabled
    public static void saveGitHubToken(String token) {
        try {
            GitHubService.setAccessToken(token);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to save GitHub token: ' + e.getMessage());
        }
    }
    
    /**
     * @description Tests the GitHub connection by fetching user info
     * @return ConnectionTestResult The result of the connection test
     */
    @AuraEnabled
    public static ConnectionTestResult testGitHubConnection() {
        ConnectionTestResult result = new ConnectionTestResult();
        
        try {
            // Try to list repos - this validates the token works
            List<GitHubService.Repository> repos = GitHubService.listRepositories();
            result.success = true;
            result.message = 'Successfully connected! Found ' + repos.size() + ' accessible repositories.';
            result.repoCount = repos.size();
        } catch (Exception e) {
            result.success = false;
            result.message = 'Connection failed: ' + e.getMessage();
        }
        
        return result;
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
                SELECT Id, Name, App_Identifier__c, Provider__c, Repository_Owner__c, 
                       Repository_Name__c, Content_Path__c, Default_Ref__c, 
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
     * @param sourceData The doc source data as JSON
     * @return DocSourceWrapper The saved doc source
     */
    @AuraEnabled
    public static DocSourceWrapper saveDocSource(Map<String, Object> sourceData) {
        try {
            Doc_Source__c source;
            
            // Check if this is an update or insert
            String recordId = (String) sourceData.get('id');
            if (String.isNotBlank(recordId)) {
                source = [SELECT Id FROM Doc_Source__c WHERE Id = :recordId LIMIT 1];
            } else {
                source = new Doc_Source__c();
            }
            
            // Map fields
            source.Name = (String) sourceData.get('name');
            source.App_Identifier__c = (String) sourceData.get('appIdentifier');
            source.Provider__c = (String) sourceData.get('provider');
            source.Repository_Owner__c = (String) sourceData.get('repositoryOwner');
            source.Repository_Name__c = (String) sourceData.get('repositoryName');
            source.Content_Path__c = (String) sourceData.get('contentPath');
            source.Default_Ref__c = (String) sourceData.get('defaultRef');
            source.Is_Active__c = sourceData.get('isActive') == true;
            source.Allow_Version_Switching__c = sourceData.get('allowVersionSwitching') == true;
            source.Description__c = (String) sourceData.get('description');
            
            upsert source;
            
            // Re-query to get all fields
            source = [
                SELECT Id, Name, App_Identifier__c, Provider__c, Repository_Owner__c, 
                       Repository_Name__c, Content_Path__c, Default_Ref__c, 
                       Is_Active__c, Allow_Version_Switching__c, Description__c,
                       CreatedDate, LastModifiedDate
                FROM Doc_Source__c
                WHERE Id = :source.Id
            ];
            
            return new DocSourceWrapper(source);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to save doc source: ' + e.getMessage());
        }
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
            String owner = (String) sourceData.get('repositoryOwner');
            String repo = (String) sourceData.get('repositoryName');
            String contentPath = (String) sourceData.get('contentPath');
            String defaultRef = (String) sourceData.get('defaultRef');
            
            if (provider != 'GitHub') {
                result.valid = false;
                result.message = 'Only GitHub is currently supported.';
                return result;
            }
            
            // Test that we can access the repo
            List<GitHubService.Branch> branches = GitHubService.getBranches(owner, repo);
            
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
                List<GitHubService.Branch> tags = GitHubService.getTags(owner, repo);
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
                    List<GitHubService.TreeItem> tree = GitHubService.getTree(owner, repo, defaultRef, true);
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
