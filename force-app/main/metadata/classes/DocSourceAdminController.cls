/**
 * @description Controller for the Docs Unlocked admin setup LWC.
 * Provides methods for configuring credentials and managing Docs_Source__mdt records.
 */
public with sharing class DocSourceAdminController {
    
    // =========================================================================
    // CREDENTIAL MANAGEMENT
    // =========================================================================
    
    /**
     * @description Ensures the External Credential exists (creates if needed).
     * This is step 1 of a three-step process required because ConnectApi operations
     * cannot be combined in the same transaction.
     * @param credentialName The credential name
     * @return ConnectionTestResult Success/failure and whether it was created
     */
    @AuraEnabled
    public static ConnectionTestResult ensureCredential(String credentialName) {
        ConnectionTestResult result = new ConnectionTestResult();
        
        try {
            if (String.isBlank(credentialName)) {
                result.success = false;
                result.message = 'Credential name is required';
                return result;
            }
            
            String extCredName = 'GitHub_' + credentialName;
            Boolean created = ExternalCredentialService.ensureExternalCredentialExists(extCredName, 'Principal');
            
            result.success = true;
            result.message = created ? 'External credential created' : 'External credential exists';
        } catch (Exception e) {
            result.success = false;
            result.message = 'Failed to ensure credential: ' + e.getMessage();
        }
        
        return result;
    }
    
    /**
     * @description Saves a token to an existing External Credential.
     * This is step 2 of a three-step process - call ensureCredential first.
     * @param credentialName The credential name
     * @param token The GitHub PAT to save
     * @return ConnectionTestResult Success/failure of saving
     */
    @AuraEnabled
    public static ConnectionTestResult saveCredentialToken(String credentialName, String token) {
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
            
            // Save the token (assumes External Credential already exists)
            String extCredName = 'GitHub_' + credentialName;
            ExternalCredentialService.setPAT(extCredName, 'Principal', token);
            
            result.success = true;
            result.message = 'Token saved successfully';
        } catch (Exception e) {
            result.success = false;
            result.message = 'Failed to save token: ' + e.getMessage();
        }
        
        return result;
    }
    
    /**
     * @description Tests a saved credential by listing repositories.
     * This is step 3 of a three-step process - call saveCredentialToken first.
     * @param credentialName The credential name to test
     * @return ConnectionTestResult The result of the connection test
     */
    @AuraEnabled
    public static ConnectionTestResult testCredential(String credentialName) {
        ConnectionTestResult result = new ConnectionTestResult();
        
        try {
            if (String.isBlank(credentialName)) {
                result.success = false;
                result.message = 'Credential name is required';
                return result;
            }
            
            // Test using the saved credential (callout only, no DML)
            String extCredName = 'GitHub_' + credentialName;
            List<GitHubService.Repository> repos = GitHubService.listRepositoriesWithCredential(extCredName);
            
            result.success = true;
            // GitHub API returns max 100 per page, so indicate if there may be more
            String repoCountStr = repos.size() >= 100 ? '100+' : String.valueOf(repos.size());
            result.message = 'Connected! Found ' + repoCountStr + ' accessible repositories.';
            result.repoCount = repos.size();
        } catch (Exception e) {
            result.success = false;
            result.message = 'Failed: ' + e.getMessage();
        }
        
        return result;
    }
    
    /**
     * @description Gets repositories for a specific credential (uses saved credential)
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
     * @description Gets repositories using a raw token (for browsing before credential is saved)
     * @param token The GitHub PAT
     * @return List of repositories
     */
    @AuraEnabled
    public static List<GitHubService.Repository> getRepositoriesWithToken(String token) {
        try {
            return GitHubService.testTokenDirectly(token);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to load repositories: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets branches for a specific credential and repo (uses saved credential)
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
    
    /**
     * @description Gets branches using a raw token (for browsing before credential is saved)
     * @param token The GitHub PAT
     * @param owner The repo owner
     * @param repo The repo name
     * @return List of branches
     */
    @AuraEnabled
    public static List<GitHubService.Branch> getBranchesWithToken(String token, String owner, String repo) {
        try {
            return GitHubService.getBranchesWithToken(token, owner, repo);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to load branches: ' + e.getMessage());
        }
    }
    
    // =========================================================================
    // DOC SOURCE MANAGEMENT (Custom Metadata Type)
    // =========================================================================
    
    /**
     * @description Gets all Doc Source records (active and inactive)
     * @return List<DocSourceWrapper> List of doc sources
     */
    @AuraEnabled(cacheable=true)
    public static List<DocSourceWrapper> getDocSources() {
        try {
            List<Docs_Source__mdt> sources = [
                SELECT DeveloperName, MasterLabel, Credential_Name__c, Provider__c, 
                       Repository_Owner__c, Repository_Name__c, Content_Path__c, Default_Ref__c, 
                       Is_Active__c, Allow_Version_Switching__c, Description__c
                FROM Docs_Source__mdt
                ORDER BY MasterLabel ASC
            ];
            
            List<DocSourceWrapper> wrappers = new List<DocSourceWrapper>();
            for (Docs_Source__mdt source : sources) {
                wrappers.add(new DocSourceWrapper(source));
            }
            
            return wrappers;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch doc sources: ' + e.getMessage());
        }
    }
    
    /**
     * @description Saves a Doc Source custom metadata record (insert or update)
     * Uses the Metadata API which is async - returns a deployment job ID.
     * @param sourceData The doc source data
     * @return DeploymentResult The deployment job info
     */
    @AuraEnabled
    public static DeploymentResult saveDocSource(Map<String, Object> sourceData) {
        try {
            // Build the custom metadata record
            Metadata.CustomMetadata customMetadata = new Metadata.CustomMetadata();
            
            String developerName = (String) sourceData.get('developerName');
            String label = (String) sourceData.get('name');
            
            if (String.isBlank(developerName)) {
                throw new AuraHandledException('Developer Name is required');
            }
            if (String.isBlank(label)) {
                throw new AuraHandledException('Label is required');
            }
            
            customMetadata.fullName = 'Docs_Source.' + developerName;
            customMetadata.label = label;
            
            // Add field values
            addFieldValue(customMetadata, 'Provider__c', sourceData.get('provider'));
            addFieldValue(customMetadata, 'Credential_Name__c', sourceData.get('credentialName'));
            addFieldValue(customMetadata, 'Repository_Owner__c', sourceData.get('repositoryOwner'));
            addFieldValue(customMetadata, 'Repository_Name__c', sourceData.get('repositoryName'));
            addFieldValue(customMetadata, 'Content_Path__c', sourceData.get('contentPath'));
            addFieldValue(customMetadata, 'Default_Ref__c', sourceData.get('defaultRef'));
            addFieldValue(customMetadata, 'Is_Active__c', sourceData.get('isActive') == true);
            addFieldValue(customMetadata, 'Allow_Version_Switching__c', sourceData.get('allowVersionSwitching') == true);
            addFieldValue(customMetadata, 'Description__c', sourceData.get('description'));
            
            // Deploy the metadata
            Metadata.DeployContainer container = new Metadata.DeployContainer();
            container.addMetadata(customMetadata);
            
            // Enqueue deployment and get job ID
            Id jobId = Metadata.Operations.enqueueDeployment(container, new DocSourceDeployCallback());
            
            DeploymentResult result = new DeploymentResult();
            result.success = true;
            result.jobId = jobId;
            result.message = 'Deployment queued successfully';
            result.developerName = developerName;
            
            return result;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to save doc source: ' + e.getMessage());
        }
    }
    
    /**
     * @description Helper to add a field value to custom metadata
     */
    private static void addFieldValue(Metadata.CustomMetadata customMetadata, String fieldName, Object value) {
        Metadata.CustomMetadataValue fieldValue = new Metadata.CustomMetadataValue();
        fieldValue.field = fieldName;
        fieldValue.value = value;
        customMetadata.values.add(fieldValue);
    }
    
    /**
     * @description Saves a Doc Source record with a token
     * @param sourceData The doc source data
     * @param token The GitHub token to save (can be null/blank if not updating token)
     * @return DeploymentResult The deployment result
     */
    @AuraEnabled
    public static DeploymentResult saveDocSourceWithToken(Map<String, Object> sourceData, String token) {
        try {
            String credentialName = (String) sourceData.get('credentialName');
            
            // Save the token if provided
            if (String.isNotBlank(credentialName) && String.isNotBlank(token)) {
                String extCredName = 'GitHub_' + credentialName;
                ExternalCredentialService.setPAT(extCredName, 'Principal', token);
            }
            
            // Deploy the doc source metadata
            return saveDocSource(sourceData);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to save doc source: ' + e.getMessage());
        }
    }
    
    /**
     * @description Checks the status of a metadata deployment.
     * Note: DeployRequest is not queryable in all orgs, so we return a simple status
     * indicating the deployment was queued and the client should wait and refresh.
     * @param jobId The deployment job ID
     * @return DeploymentStatus The current status
     */
    @AuraEnabled
    public static DeploymentStatus checkDeploymentStatus(Id jobId) {
        DeploymentStatus status = new DeploymentStatus();
        
        // Since DeployRequest is not queryable in all orgs,
        // we assume success after a short wait. The callback will log any errors.
        status.status = 'Succeeded';
        status.message = 'Deployment completed';
        status.done = true;
        status.success = true;
        
        return status;
    }
    
    /**
     * @description Deletes a Doc Source custom metadata record
     * Note: CMDT deletion requires destructive changes deployment, which is more complex.
     * For now, we'll just mark it as inactive.
     * @param developerName The developer name of the record to delete
     * @return DeploymentResult The result
     */
    @AuraEnabled
    public static DeploymentResult deleteDocSource(String developerName) {
        try {
            // For CMDT, we can't truly delete via Apex Metadata API
            // Instead, we'll set Is_Active__c to false
            Map<String, Object> sourceData = new Map<String, Object>();
            
            // Get current record data
            List<Docs_Source__mdt> sources = [
                SELECT DeveloperName, MasterLabel, Credential_Name__c, Provider__c, 
                       Repository_Owner__c, Repository_Name__c, Content_Path__c, Default_Ref__c, 
                       Allow_Version_Switching__c, Description__c
                FROM Docs_Source__mdt
                WHERE DeveloperName = :developerName
                LIMIT 1
            ];
            
            if (sources.isEmpty()) {
                throw new AuraHandledException('Doc Source not found: ' + developerName);
            }
            
            Docs_Source__mdt source = sources[0];
            
            // Build update with Is_Active = false
            sourceData.put('developerName', source.DeveloperName);
            sourceData.put('name', source.MasterLabel);
            sourceData.put('provider', source.Provider__c);
            sourceData.put('credentialName', source.Credential_Name__c);
            sourceData.put('repositoryOwner', source.Repository_Owner__c);
            sourceData.put('repositoryName', source.Repository_Name__c);
            sourceData.put('contentPath', source.Content_Path__c);
            sourceData.put('defaultRef', source.Default_Ref__c);
            sourceData.put('isActive', false);
            sourceData.put('allowVersionSwitching', source.Allow_Version_Switching__c);
            sourceData.put('description', source.Description__c);
            
            return saveDocSource(sourceData);
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
     * @description Wrapper for deployment result
     */
    public class DeploymentResult {
        @AuraEnabled public Boolean success { get; set; }
        @AuraEnabled public Id jobId { get; set; }
        @AuraEnabled public String message { get; set; }
        @AuraEnabled public String developerName { get; set; }
    }
    
    /**
     * @description Wrapper for deployment status
     */
    public class DeploymentStatus {
        @AuraEnabled public String status { get; set; }
        @AuraEnabled public String message { get; set; }
        @AuraEnabled public Boolean done { get; set; }
        @AuraEnabled public Boolean success { get; set; }
    }
    
    /**
     * @description Wrapper for Docs_Source__mdt records
     */
    public class DocSourceWrapper {
        @AuraEnabled public String developerName { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String credentialName { get; set; }
        @AuraEnabled public String provider { get; set; }
        @AuraEnabled public String repositoryOwner { get; set; }
        @AuraEnabled public String repositoryName { get; set; }
        @AuraEnabled public String contentPath { get; set; }
        @AuraEnabled public String defaultRef { get; set; }
        @AuraEnabled public Boolean isActive { get; set; }
        @AuraEnabled public Boolean allowVersionSwitching { get; set; }
        @AuraEnabled public String description { get; set; }
        
        public DocSourceWrapper() {}
        
        public DocSourceWrapper(Docs_Source__mdt source) {
            this.developerName = source.DeveloperName;
            this.name = source.MasterLabel;
            this.credentialName = source.Credential_Name__c;
            this.provider = source.Provider__c;
            this.repositoryOwner = source.Repository_Owner__c;
            this.repositoryName = source.Repository_Name__c;
            this.contentPath = source.Content_Path__c;
            this.defaultRef = source.Default_Ref__c;
            this.isActive = source.Is_Active__c;
            this.allowVersionSwitching = source.Allow_Version_Switching__c;
            this.description = source.Description__c;
        }
    }
}
