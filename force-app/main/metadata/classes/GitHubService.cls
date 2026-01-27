/**
 * @description Service class for interacting with the GitHub API.
 * Handles authentication via External Credentials and provides methods
 * for fetching repository content, branches, releases, and directory trees.
 */
public class GitHubService {
    
    private static final String GITHUB_API_BASE = 'https://api.github.com';
    public static final String EXTERNAL_CREDENTIAL_NAME = 'GitHub';
    public static final String PRINCIPAL_NAME = 'Principal';
    
    public class GitHubException extends Exception {}
    
    // Test-visible overrides for unit tests
    @TestVisible
    private static String testAccessToken;
    @TestVisible
    private static String testHttpResponse;
    @TestVisible
    private static Integer testHttpStatusCode;
    
    /**
     * @description Wrapper class for GitHub repository info
     */
    public class Repository {
        @AuraEnabled public String id { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String fullName { get; set; }
        @AuraEnabled public String description { get; set; }
        @AuraEnabled public String defaultBranch { get; set; }
        @AuraEnabled public Boolean isPrivate { get; set; }
        @AuraEnabled public String owner { get; set; }
    }
    
    /**
     * @description Wrapper class for GitHub branch info
     */
    public class Branch {
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String sha { get; set; }
    }
    
    /**
     * @description Wrapper class for GitHub release/tag info
     */
    public class Release {
        @AuraEnabled public String id { get; set; }
        @AuraEnabled public String tagName { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public Boolean isDraft { get; set; }
        @AuraEnabled public Boolean isPrerelease { get; set; }
        @AuraEnabled public Datetime publishedAt { get; set; }
    }
    
    /**
     * @description Wrapper class for GitHub tree item (file/directory)
     */
    public class TreeItem {
        @AuraEnabled public String path { get; set; }
        @AuraEnabled public String type { get; set; } // 'blob' or 'tree'
        @AuraEnabled public String sha { get; set; }
        @AuraEnabled public Integer size { get; set; }
    }
    
    /**
     * @description Wrapper class for GitHub file content
     */
    public class FileContent {
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String path { get; set; }
        @AuraEnabled public String sha { get; set; }
        @AuraEnabled public Integer size { get; set; }
        @AuraEnabled public String content { get; set; } // Decoded content
        @AuraEnabled public String encoding { get; set; }
        @AuraEnabled public String downloadUrl { get; set; }
    }
    
    /**
     * @description Gets the GitHub access token from External Credential
     * @return String The access token (PAT)
     */
    private static String getAccessToken() {
        if (Test.isRunningTest() && testAccessToken != null) {
            return testAccessToken;
        }
        
        try {
            String token = ExternalCredentialService.getPAT(EXTERNAL_CREDENTIAL_NAME, PRINCIPAL_NAME);
            
            if (String.isBlank(token)) {
                throw new GitHubException('GitHub token not found. Please configure your GitHub Personal Access Token in the Docs Unlocked setup.');
            }
            
            return token;
        } catch (GitHubException e) {
            throw e;
        } catch (Exception e) {
            throw new GitHubException('Failed to retrieve GitHub credentials: ' + e.getMessage());
        }
    }
    
    /**
     * @description Checks if GitHub credentials are configured
     * @return Boolean True if credentials are configured
     */
    public static Boolean isConfigured() {
        if (Test.isRunningTest() && testAccessToken != null) {
            return true;
        }
        return ExternalCredentialService.hasPAT(EXTERNAL_CREDENTIAL_NAME, PRINCIPAL_NAME);
    }
    
    /**
     * @description Sets the GitHub PAT (for admin setup)
     * @param token The GitHub Personal Access Token
     */
    public static void setAccessToken(String token) {
        if (String.isBlank(token)) {
            throw new GitHubException('Token cannot be blank');
        }
        ExternalCredentialService.setPAT(EXTERNAL_CREDENTIAL_NAME, PRINCIPAL_NAME, token);
    }
    
    /**
     * @description Gets access token for a specific external credential
     * @param externalCredentialName The external credential name
     * @return String The access token
     */
    private static String getAccessTokenForCredential(String externalCredentialName) {
        if (Test.isRunningTest() && testAccessToken != null) {
            return testAccessToken;
        }
        
        try {
            String token = ExternalCredentialService.getPAT(externalCredentialName, PRINCIPAL_NAME);
            
            if (String.isBlank(token)) {
                throw new GitHubException('GitHub token not found for credential: ' + externalCredentialName);
            }
            
            return token;
        } catch (GitHubException e) {
            throw e;
        } catch (Exception e) {
            throw new GitHubException('Failed to retrieve GitHub credentials: ' + e.getMessage());
        }
    }
    
    /**
     * @description Makes an authenticated HTTP request to the GitHub API
     * @param endpoint The API endpoint (relative to base URL)
     * @param method The HTTP method (GET, POST, etc.)
     * @return HttpResponse The response from GitHub
     */
    private static HttpResponse makeRequest(String endpoint, String method) {
        return makeRequestWithCredential(endpoint, method, EXTERNAL_CREDENTIAL_NAME);
    }
    
    /**
     * @description Makes an authenticated HTTP request with a specific credential
     * @param endpoint The API endpoint (relative to base URL)
     * @param method The HTTP method (GET, POST, etc.)
     * @param externalCredentialName The external credential to use
     * @return HttpResponse The response from GitHub
     */
    private static HttpResponse makeRequestWithCredential(String endpoint, String method, String externalCredentialName) {
        // Test mode with mock response
        if (Test.isRunningTest() && testHttpResponse != null) {
            HttpResponse mockRes = new HttpResponse();
            mockRes.setStatusCode(testHttpStatusCode != null ? testHttpStatusCode : 200);
            mockRes.setBody(testHttpResponse);
            return mockRes;
        }
        
        String token = getAccessTokenForCredential(externalCredentialName);
        
        HttpRequest req = new HttpRequest();
        req.setEndpoint(GITHUB_API_BASE + endpoint);
        req.setMethod(method);
        req.setHeader('Authorization', 'Bearer ' + token);
        req.setHeader('Accept', 'application/vnd.github+json');
        req.setHeader('X-GitHub-Api-Version', '2022-11-28');
        req.setTimeout(30000);
        
        Http http = new Http();
        return http.send(req);
    }
    
    /**
     * @description Lists repositories accessible to the authenticated user
     * @return List<Repository> List of repositories
     */
    public static List<Repository> listRepositories() {
        return listRepositoriesWithCredential(EXTERNAL_CREDENTIAL_NAME);
    }
    
    /**
     * @description Lists repositories with a specific credential
     * @param externalCredentialName The external credential to use
     * @return List<Repository> List of repositories
     */
    public static List<Repository> listRepositoriesWithCredential(String externalCredentialName) {
        HttpResponse res = makeRequestWithCredential('/user/repos?per_page=100&sort=updated', 'GET', externalCredentialName);
        
        if (res.getStatusCode() != 200) {
            throw new GitHubException('Failed to list repositories: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
        
        List<Repository> repos = new List<Repository>();
        List<Object> repoList = (List<Object>) JSON.deserializeUntyped(res.getBody());
        
        for (Object repoObj : repoList) {
            Map<String, Object> repoMap = (Map<String, Object>) repoObj;
            Repository repo = new Repository();
            repo.id = String.valueOf(repoMap.get('id'));
            repo.name = (String) repoMap.get('name');
            repo.fullName = (String) repoMap.get('full_name');
            repo.description = (String) repoMap.get('description');
            repo.defaultBranch = (String) repoMap.get('default_branch');
            repo.isPrivate = (Boolean) repoMap.get('private');
            
            Map<String, Object> ownerMap = (Map<String, Object>) repoMap.get('owner');
            repo.owner = (String) ownerMap.get('login');
            
            repos.add(repo);
        }
        
        return repos;
    }
    
    /**
     * @description Gets branches for a repository
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<Branch> List of branches
     */
    public static List<Branch> getBranches(String owner, String repo) {
        return getBranchesWithCredential(EXTERNAL_CREDENTIAL_NAME, owner, repo);
    }
    
    /**
     * @description Gets branches with a specific credential
     * @param externalCredentialName The external credential to use
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<Branch> List of branches
     */
    public static List<Branch> getBranchesWithCredential(String externalCredentialName, String owner, String repo) {
        String endpoint = '/repos/' + EncodingUtil.urlEncode(owner, 'UTF-8') + '/' + 
            EncodingUtil.urlEncode(repo, 'UTF-8') + '/branches?per_page=100';
        
        HttpResponse res = makeRequestWithCredential(endpoint, 'GET', externalCredentialName);
        
        if (res.getStatusCode() != 200) {
            throw new GitHubException('Failed to get branches: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
        
        List<Branch> branches = new List<Branch>();
        List<Object> branchList = (List<Object>) JSON.deserializeUntyped(res.getBody());
        
        for (Object branchObj : branchList) {
            Map<String, Object> branchMap = (Map<String, Object>) branchObj;
            Branch branch = new Branch();
            branch.name = (String) branchMap.get('name');
            
            Map<String, Object> commitMap = (Map<String, Object>) branchMap.get('commit');
            branch.sha = (String) commitMap.get('sha');
            
            branches.add(branch);
        }
        
        return branches;
    }
    
    /**
     * @description Gets releases for a repository
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<Release> List of releases
     */
    public static List<Release> getReleases(String owner, String repo) {
        return getReleasesWithCredential(EXTERNAL_CREDENTIAL_NAME, owner, repo);
    }
    
    /**
     * @description Gets releases with a specific credential
     * @param externalCredentialName The external credential to use
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<Release> List of releases
     */
    public static List<Release> getReleasesWithCredential(String externalCredentialName, String owner, String repo) {
        String endpoint = '/repos/' + EncodingUtil.urlEncode(owner, 'UTF-8') + '/' + 
            EncodingUtil.urlEncode(repo, 'UTF-8') + '/releases?per_page=100';
        
        HttpResponse res = makeRequestWithCredential(endpoint, 'GET', externalCredentialName);
        
        if (res.getStatusCode() != 200) {
            throw new GitHubException('Failed to get releases: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
        
        List<Release> releases = new List<Release>();
        List<Object> releaseList = (List<Object>) JSON.deserializeUntyped(res.getBody());
        
        for (Object releaseObj : releaseList) {
            Map<String, Object> releaseMap = (Map<String, Object>) releaseObj;
            Release rel = new Release();
            rel.id = String.valueOf(releaseMap.get('id'));
            rel.tagName = (String) releaseMap.get('tag_name');
            rel.name = (String) releaseMap.get('name');
            rel.isDraft = (Boolean) releaseMap.get('draft');
            rel.isPrerelease = (Boolean) releaseMap.get('prerelease');
            
            String publishedAtStr = (String) releaseMap.get('published_at');
            if (String.isNotBlank(publishedAtStr)) {
                rel.publishedAt = Datetime.valueOf(publishedAtStr.replace('T', ' ').replace('Z', ''));
            }
            
            releases.add(rel);
        }
        
        return releases;
    }
    
    /**
     * @description Gets tags for a repository (alternative to releases)
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<Branch> List of tags (using Branch wrapper since structure is similar)
     */
    public static List<Branch> getTags(String owner, String repo) {
        return getTagsWithCredential(EXTERNAL_CREDENTIAL_NAME, owner, repo);
    }
    
    /**
     * @description Gets tags with a specific credential
     * @param externalCredentialName The external credential to use
     * @param owner The repository owner
     * @param repo The repository name
     * @return List<Branch> List of tags
     */
    public static List<Branch> getTagsWithCredential(String externalCredentialName, String owner, String repo) {
        String endpoint = '/repos/' + EncodingUtil.urlEncode(owner, 'UTF-8') + '/' + 
            EncodingUtil.urlEncode(repo, 'UTF-8') + '/tags?per_page=100';
        
        HttpResponse res = makeRequestWithCredential(endpoint, 'GET', externalCredentialName);
        
        if (res.getStatusCode() != 200) {
            throw new GitHubException('Failed to get tags: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
        
        List<Branch> tags = new List<Branch>();
        List<Object> tagList = (List<Object>) JSON.deserializeUntyped(res.getBody());
        
        for (Object tagObj : tagList) {
            Map<String, Object> tagMap = (Map<String, Object>) tagObj;
            Branch tag = new Branch();
            tag.name = (String) tagMap.get('name');
            
            Map<String, Object> commitMap = (Map<String, Object>) tagMap.get('commit');
            tag.sha = (String) commitMap.get('sha');
            
            tags.add(tag);
        }
        
        return tags;
    }
    
    /**
     * @description Gets the directory tree for a repository at a specific ref
     * @param owner The repository owner
     * @param repo The repository name
     * @param ref The git reference (branch, tag, or commit SHA)
     * @param recursive Whether to fetch the full tree recursively
     * @return List<TreeItem> List of tree items
     */
    public static List<TreeItem> getTree(String owner, String repo, String ref, Boolean recursive) {
        return getTreeWithCredential(EXTERNAL_CREDENTIAL_NAME, owner, repo, ref, recursive);
    }
    
    /**
     * @description Gets the directory tree with a specific credential
     * @param externalCredentialName The external credential to use
     * @param owner The repository owner
     * @param repo The repository name
     * @param ref The git reference (branch, tag, or commit SHA)
     * @param recursive Whether to fetch the full tree recursively
     * @return List<TreeItem> List of tree items
     */
    public static List<TreeItem> getTreeWithCredential(String externalCredentialName, String owner, String repo, String ref, Boolean recursive) {
        String endpoint = '/repos/' + EncodingUtil.urlEncode(owner, 'UTF-8') + '/' + 
            EncodingUtil.urlEncode(repo, 'UTF-8') + '/git/trees/' + EncodingUtil.urlEncode(ref, 'UTF-8');
        
        if (recursive) {
            endpoint += '?recursive=1';
        }
        
        HttpResponse res = makeRequestWithCredential(endpoint, 'GET', externalCredentialName);
        
        if (res.getStatusCode() != 200) {
            throw new GitHubException('Failed to get tree: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
        
        List<TreeItem> items = new List<TreeItem>();
        Map<String, Object> responseMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        List<Object> treeList = (List<Object>) responseMap.get('tree');
        
        for (Object itemObj : treeList) {
            Map<String, Object> itemMap = (Map<String, Object>) itemObj;
            TreeItem item = new TreeItem();
            item.path = (String) itemMap.get('path');
            item.type = (String) itemMap.get('type');
            item.sha = (String) itemMap.get('sha');
            
            Object sizeObj = itemMap.get('size');
            if (sizeObj != null) {
                item.size = Integer.valueOf(sizeObj);
            }
            
            items.add(item);
        }
        
        return items;
    }
    
    /**
     * @description Gets the contents of a file or directory
     * @param owner The repository owner
     * @param repo The repository name
     * @param path The file or directory path
     * @param ref The git reference (branch, tag, or commit SHA)
     * @return List<FileContent> List of file contents (single item for file, multiple for directory)
     */
    public static List<FileContent> getContents(String owner, String repo, String path, String ref) {
        return getContentsWithCredential(EXTERNAL_CREDENTIAL_NAME, owner, repo, path, ref);
    }
    
    /**
     * @description Gets contents with a specific credential
     * @param externalCredentialName The external credential to use
     * @param owner The repository owner
     * @param repo The repository name
     * @param path The file or directory path
     * @param ref The git reference (branch, tag, or commit SHA)
     * @return List<FileContent> List of file contents
     */
    public static List<FileContent> getContentsWithCredential(String externalCredentialName, String owner, String repo, String path, String ref) {
        String endpoint = '/repos/' + EncodingUtil.urlEncode(owner, 'UTF-8') + '/' + 
            EncodingUtil.urlEncode(repo, 'UTF-8') + '/contents/' + path;
        
        if (String.isNotBlank(ref)) {
            endpoint += '?ref=' + EncodingUtil.urlEncode(ref, 'UTF-8');
        }
        
        HttpResponse res = makeRequestWithCredential(endpoint, 'GET', externalCredentialName);
        
        if (res.getStatusCode() != 200) {
            throw new GitHubException('Failed to get contents: ' + res.getStatusCode() + ' - ' + res.getBody());
        }
        
        List<FileContent> contents = new List<FileContent>();
        Object responseObj = JSON.deserializeUntyped(res.getBody());
        
        // Response can be a single object (file) or array (directory)
        if (responseObj instanceof List<Object>) {
            // Directory listing
            for (Object itemObj : (List<Object>) responseObj) {
                contents.add(parseFileContent((Map<String, Object>) itemObj, false));
            }
        } else {
            // Single file
            contents.add(parseFileContent((Map<String, Object>) responseObj, true));
        }
        
        return contents;
    }
    
    /**
     * @description Gets the raw content of a single file (decoded)
     * @param owner The repository owner
     * @param repo The repository name
     * @param path The file path
     * @param ref The git reference (branch, tag, or commit SHA)
     * @return String The decoded file content
     */
    public static String getFileContent(String owner, String repo, String path, String ref) {
        return getFileContentWithCredential(EXTERNAL_CREDENTIAL_NAME, owner, repo, path, ref);
    }
    
    /**
     * @description Gets file content with a specific credential
     * @param externalCredentialName The external credential to use
     * @param owner The repository owner
     * @param repo The repository name
     * @param path The file path
     * @param ref The git reference (branch, tag, or commit SHA)
     * @return String The decoded file content
     */
    public static String getFileContentWithCredential(String externalCredentialName, String owner, String repo, String path, String ref) {
        List<FileContent> contents = getContentsWithCredential(externalCredentialName, owner, repo, path, ref);
        
        if (contents.isEmpty()) {
            throw new GitHubException('File not found: ' + path);
        }
        
        FileContent file = contents[0];
        return file.content;
    }
    
    /**
     * @description Parses a file content response from GitHub API
     * @param itemMap The raw response map
     * @param decodeContent Whether to decode the base64 content
     * @return FileContent The parsed file content
     */
    private static FileContent parseFileContent(Map<String, Object> itemMap, Boolean decodeContent) {
        FileContent fc = new FileContent();
        fc.name = (String) itemMap.get('name');
        fc.path = (String) itemMap.get('path');
        fc.sha = (String) itemMap.get('sha');
        fc.encoding = (String) itemMap.get('encoding');
        fc.downloadUrl = (String) itemMap.get('download_url');
        
        Object sizeObj = itemMap.get('size');
        if (sizeObj != null) {
            fc.size = Integer.valueOf(sizeObj);
        }
        
        if (decodeContent && itemMap.containsKey('content')) {
            String encodedContent = (String) itemMap.get('content');
            if (String.isNotBlank(encodedContent) && fc.encoding == 'base64') {
                // GitHub returns base64 content with newlines, remove them before decoding
                encodedContent = encodedContent.replaceAll('\\s', '');
                fc.content = EncodingUtil.base64Decode(encodedContent).toString();
            } else {
                fc.content = encodedContent;
            }
        }
        
        return fc;
    }
    
    /**
     * @description Filters tree items to only include files within a specific path prefix
     * @param items The full tree items list
     * @param pathPrefix The path prefix to filter by (e.g., 'docs/' or 'public/content/')
     * @return List<TreeItem> Filtered tree items
     */
    public static List<TreeItem> filterTreeByPath(List<TreeItem> items, String pathPrefix) {
        List<TreeItem> filtered = new List<TreeItem>();
        
        // Normalize path prefix
        if (String.isNotBlank(pathPrefix) && !pathPrefix.endsWith('/')) {
            pathPrefix += '/';
        }
        
        for (TreeItem item : items) {
            if (String.isBlank(pathPrefix) || item.path.startsWith(pathPrefix)) {
                filtered.add(item);
            }
        }
        
        return filtered;
    }
    
    /**
     * @description Filters tree items to only include markdown files
     * @param items The tree items list
     * @return List<TreeItem> Filtered tree items (only .md files)
     */
    public static List<TreeItem> filterMarkdownFiles(List<TreeItem> items) {
        List<TreeItem> filtered = new List<TreeItem>();
        
        for (TreeItem item : items) {
            if (item.type == 'blob' && item.path.toLowerCase().endsWith('.md')) {
                filtered.add(item);
            }
        }
        
        return filtered;
    }
}
