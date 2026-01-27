/**
 * @description Controller class for GitHub integration LWC components.
 * Provides @AuraEnabled methods for fetching repositories, content, and configuration.
 * Supports multiple apps/doc sources via the Doc_Source__c custom object.
 */
public with sharing class GitHubController {
    
    /**
     * @description Gets the list of repositories accessible to the authenticated user
     * @return List<GitHubService.Repository> List of repositories
     */
    @AuraEnabled(cacheable=true)
    public static List<GitHubService.Repository> getRepositories() {
        try {
            return GitHubService.listRepositories();
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch repositories: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets branches for a specific repository
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<GitHubService.Branch> List of branches
     */
    @AuraEnabled(cacheable=true)
    public static List<GitHubService.Branch> getBranches(String owner, String repo) {
        try {
            return GitHubService.getBranches(owner, repo);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch branches: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets releases for a specific repository
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<GitHubService.Release> List of releases
     */
    @AuraEnabled(cacheable=true)
    public static List<GitHubService.Release> getReleases(String owner, String repo) {
        try {
            return GitHubService.getReleases(owner, repo);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch releases: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets tags for a specific repository
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<GitHubService.Branch> List of tags
     */
    @AuraEnabled(cacheable=true)
    public static List<GitHubService.Branch> getTags(String owner, String repo) {
        try {
            return GitHubService.getTags(owner, repo);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch tags: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets the directory tree for a repository, filtered by content path
     * @param owner The repository owner
     * @param repo The repository name
     * @param ref The git reference (branch/tag/sha)
     * @param contentPath The path prefix to filter by (e.g., 'docs/' or 'public/content/')
     * @return List<GitHubService.TreeItem> List of tree items
     */
    @AuraEnabled(cacheable=true)
    public static List<GitHubService.TreeItem> getContentTree(String owner, String repo, String ref, String contentPath) {
        try {
            List<GitHubService.TreeItem> fullTree = GitHubService.getTree(owner, repo, ref, true);
            List<GitHubService.TreeItem> filtered = GitHubService.filterTreeByPath(fullTree, contentPath);
            return GitHubService.filterMarkdownFiles(filtered);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch content tree: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets the content of a specific markdown file
     * @param owner The repository owner
     * @param repo The repository name
     * @param path The file path
     * @param ref The git reference (branch/tag/sha)
     * @return String The markdown content
     */
    @AuraEnabled(cacheable=true)
    public static String getMarkdownContent(String owner, String repo, String path, String ref) {
        try {
            return GitHubService.getFileContent(owner, repo, path, ref);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch file content: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets the full directory listing for a path (files and folders)
     * @param owner The repository owner
     * @param repo The repository name
     * @param path The directory path
     * @param ref The git reference (branch/tag/sha)
     * @return List<GitHubService.FileContent> List of files/folders
     */
    @AuraEnabled(cacheable=true)
    public static List<GitHubService.FileContent> getDirectoryContents(String owner, String repo, String path, String ref) {
        try {
            return GitHubService.getContents(owner, repo, path, ref);
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch directory contents: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets the GitHub configuration for a specific app by its identifier
     * @param appIdentifier The unique app identifier
     * @return GitHubConfig The configuration for the app
     */
    @AuraEnabled(cacheable=true)
    public static GitHubConfig getConfigurationByApp(String appIdentifier) {
        try {
            if (String.isBlank(appIdentifier)) {
                throw new AuraHandledException('App identifier is required');
            }
            
            List<Doc_Source__c> sources = [
                SELECT Id, Name, App_Identifier__c, Repository_Owner__c, Repository_Name__c,
                       Content_Path__c, Default_Ref__c, Is_Active__c, Description__c,
                       Allow_Version_Switching__c, Provider__c
                FROM Doc_Source__c
                WHERE App_Identifier__c = :appIdentifier
                AND Is_Active__c = true
                LIMIT 1
            ];
            
            if (sources.isEmpty()) {
                return null;
            }
            
            return mapSourceToConfig(sources[0]);
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch configuration: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets all active GitHub doc source configurations
     * @return List<GitHubConfig> List of all active configurations
     */
    @AuraEnabled(cacheable=true)
    public static List<GitHubConfig> getAllConfigurations() {
        try {
            List<Doc_Source__c> sources = [
                SELECT Id, Name, App_Identifier__c, Repository_Owner__c, Repository_Name__c,
                       Content_Path__c, Default_Ref__c, Is_Active__c, Description__c,
                       Allow_Version_Switching__c, Provider__c
                FROM Doc_Source__c
                WHERE Is_Active__c = true
                ORDER BY Name ASC
            ];
            
            List<GitHubConfig> configs = new List<GitHubConfig>();
            for (Doc_Source__c source : sources) {
                configs.add(mapSourceToConfig(source));
            }
            
            return configs;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch configurations: ' + e.getMessage());
        }
    }
    
    /**
     * @description Gets all available version options (branches + tags + releases) for an app
     * @param appIdentifier The unique app identifier
     * @return VersionOptions The available versions
     */
    @AuraEnabled(cacheable=true)
    public static VersionOptions getVersionOptionsByApp(String appIdentifier) {
        try {
            GitHubConfig config = getConfigurationByApp(appIdentifier);
            
            if (config == null) {
                throw new AuraHandledException('No configuration found for app: ' + appIdentifier);
            }
            
            VersionOptions options = new VersionOptions();
            options.branches = GitHubService.getBranches(config.repositoryOwner, config.repositoryName);
            options.tags = GitHubService.getTags(config.repositoryOwner, config.repositoryName);
            options.releases = GitHubService.getReleases(config.repositoryOwner, config.repositoryName);
            options.allowVersionSwitching = config.allowVersionSwitching;
            options.defaultRef = config.defaultRef;
            
            return options;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to fetch version options: ' + e.getMessage());
        }
    }
    
    /**
     * @description Fetches all markdown content for a configured app
     * This is used to load all docs at once for the main docs viewer
     * @param appIdentifier The unique app identifier
     * @param ref Optional git reference override (defaults to configured default)
     * @return DocsContent The full documentation content
     */
    @AuraEnabled
    public static DocsContent getDocsContentByApp(String appIdentifier, String ref) {
        try {
            GitHubConfig config = getConfigurationByApp(appIdentifier);
            
            if (config == null) {
                throw new AuraHandledException('No documentation source configured for app: ' + appIdentifier + 
                    '. Please create a Doc_Source__c record with this App_Identifier__c.');
            }
            
            String useRef = String.isNotBlank(ref) ? ref : config.defaultRef;
            
            // Get the content tree
            List<GitHubService.TreeItem> tree = GitHubService.getTree(
                config.repositoryOwner, 
                config.repositoryName, 
                useRef, 
                true
            );
            
            // Filter to just markdown files in content path
            List<GitHubService.TreeItem> filtered = GitHubService.filterTreeByPath(tree, config.contentPath);
            List<GitHubService.TreeItem> mdFiles = GitHubService.filterMarkdownFiles(filtered);
            
            // Build the manifest and fetch content
            DocsContent result = new DocsContent();
            result.config = config;
            result.currentRef = useRef;
            result.files = new List<DocFile>();
            
            for (GitHubService.TreeItem item : mdFiles) {
                DocFile docFile = new DocFile();
                docFile.path = item.path;
                
                // Calculate relative path from content root
                if (String.isNotBlank(config.contentPath)) {
                    String prefix = config.contentPath;
                    if (!prefix.endsWith('/')) {
                        prefix += '/';
                    }
                    if (item.path.startsWith(prefix)) {
                        docFile.relativePath = item.path.substring(prefix.length());
                    } else {
                        docFile.relativePath = item.path;
                    }
                } else {
                    docFile.relativePath = item.path;
                }
                
                // Fetch the actual content
                docFile.content = GitHubService.getFileContent(
                    config.repositoryOwner,
                    config.repositoryName,
                    item.path,
                    useRef
                );
                
                result.files.add(docFile);
            }
            
            return result;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to load documentation: ' + e.getMessage());
        }
    }
    
    /**
     * @description Maps a Doc_Source__c record to a GitHubConfig wrapper
     * @param source The source record
     * @return GitHubConfig The mapped config
     */
    private static GitHubConfig mapSourceToConfig(Doc_Source__c source) {
        GitHubConfig config = new GitHubConfig();
        config.id = source.Id;
        config.name = source.Name;
        config.appIdentifier = source.App_Identifier__c;
        config.repositoryOwner = source.Repository_Owner__c;
        config.repositoryName = source.Repository_Name__c;
        config.contentPath = source.Content_Path__c;
        config.defaultRef = source.Default_Ref__c;
        config.isActive = source.Is_Active__c;
        config.description = source.Description__c;
        config.allowVersionSwitching = source.Allow_Version_Switching__c;
        config.provider = source.Provider__c;
        return config;
    }
    
    /**
     * @description Wrapper class for GitHub configuration
     */
    public class GitHubConfig {
        @AuraEnabled public Id id { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String appIdentifier { get; set; }
        @AuraEnabled public String repositoryOwner { get; set; }
        @AuraEnabled public String repositoryName { get; set; }
        @AuraEnabled public String contentPath { get; set; }
        @AuraEnabled public String defaultRef { get; set; }
        @AuraEnabled public Boolean isActive { get; set; }
        @AuraEnabled public String description { get; set; }
        @AuraEnabled public Boolean allowVersionSwitching { get; set; }
        @AuraEnabled public String provider { get; set; }
    }
    
    /**
     * @description Wrapper class for version options
     */
    public class VersionOptions {
        @AuraEnabled public List<GitHubService.Branch> branches { get; set; }
        @AuraEnabled public List<GitHubService.Branch> tags { get; set; }
        @AuraEnabled public List<GitHubService.Release> releases { get; set; }
        @AuraEnabled public Boolean allowVersionSwitching { get; set; }
        @AuraEnabled public String defaultRef { get; set; }
    }
    
    /**
     * @description Wrapper class for documentation content
     */
    public class DocsContent {
        @AuraEnabled public GitHubConfig config { get; set; }
        @AuraEnabled public String currentRef { get; set; }
        @AuraEnabled public List<DocFile> files { get; set; }
    }
    
    /**
     * @description Wrapper class for a single doc file
     */
    public class DocFile {
        @AuraEnabled public String path { get; set; }
        @AuraEnabled public String relativePath { get; set; }
        @AuraEnabled public String content { get; set; }
    }
}
