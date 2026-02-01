/**
 * @description Test class for GitHubService
 * Uses test-visible static variables to mock HTTP responses
 */
@isTest
private class GitHubServiceTest {
    
    /**
     * @description Test listRepositories method
     */
    @isTest
    static void testListRepositories() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[' +
            '{' +
                '"id": 123456,' +
                '"name": "test-repo",' +
                '"full_name": "testuser/test-repo",' +
                '"description": "A test repository",' +
                '"default_branch": "main",' +
                '"private": false,' +
                '"owner": { "login": "testuser" }' +
            '},' +
            '{' +
                '"id": 789012,' +
                '"name": "another-repo",' +
                '"full_name": "testuser/another-repo",' +
                '"description": null,' +
                '"default_branch": "master",' +
                '"private": true,' +
                '"owner": { "login": "testuser" }' +
            '}' +
        ']';
        
        Test.startTest();
        List<GitHubService.Repository> repos = GitHubService.listRepositories();
        Test.stopTest();
        
        System.assertEquals(2, repos.size(), 'Should return 2 repositories');
        System.assertEquals('test-repo', repos[0].name, 'First repo name should match');
        System.assertEquals('testuser/test-repo', repos[0].fullName, 'First repo fullName should match');
        System.assertEquals('main', repos[0].defaultBranch, 'First repo default branch should match');
        System.assertEquals(false, repos[0].isPrivate, 'First repo should be public');
        System.assertEquals('testuser', repos[0].owner, 'First repo owner should match');
        System.assertEquals(true, repos[1].isPrivate, 'Second repo should be private');
    }
    
    /**
     * @description Test listRepositories with API error
     */
    @isTest
    static void testListRepositories_Error() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 401;
        GitHubService.testHttpResponse = '{"message": "Bad credentials"}';
        
        Test.startTest();
        try {
            GitHubService.listRepositories();
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('Failed to list repositories'), 'Error message should indicate failure');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getBranches method (now returns main + tags)
     */
    @isTest
    static void testGetBranches() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        // Mock tags response (branches method now fetches tags)
        GitHubService.testHttpResponse = '[' +
            '{' +
                '"name": "v1.0.0",' +
                '"commit": { "sha": "abc123" }' +
            '},' +
            '{' +
                '"name": "v0.9.0",' +
                '"commit": { "sha": "def456" }' +
            '}' +
        ']';
        
        Test.startTest();
        List<GitHubService.Branch> refs = GitHubService.getBranches('testuser', 'test-repo');
        Test.stopTest();
        
        // Should have main + 2 tags = 3 total
        System.assertEquals(3, refs.size(), 'Should return main + 2 tags');
        System.assertEquals('main', refs[0].name, 'First ref should be main');
        System.assertEquals('v1.0.0', refs[1].name, 'Second ref should be first tag');
        System.assertEquals('abc123', refs[1].sha, 'Tag sha should match');
    }
    
    /**
     * @description Test getReleases method
     */
    @isTest
    static void testGetReleases() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[' +
            '{' +
                '"id": 1,' +
                '"tag_name": "v1.0.0",' +
                '"name": "Version 1.0.0",' +
                '"draft": false,' +
                '"prerelease": false,' +
                '"published_at": "2024-01-15T10:30:00Z"' +
            '},' +
            '{' +
                '"id": 2,' +
                '"tag_name": "v1.1.0-beta",' +
                '"name": "Version 1.1.0 Beta",' +
                '"draft": false,' +
                '"prerelease": true,' +
                '"published_at": "2024-02-01T14:00:00Z"' +
            '}' +
        ']';
        
        Test.startTest();
        List<GitHubService.Release> releases = GitHubService.getReleases('testuser', 'test-repo');
        Test.stopTest();
        
        System.assertEquals(2, releases.size(), 'Should return 2 releases');
        System.assertEquals('v1.0.0', releases[0].tagName, 'First release tag should match');
        System.assertEquals(false, releases[0].isPrerelease, 'First release should not be prerelease');
        System.assertEquals(true, releases[1].isPrerelease, 'Second release should be prerelease');
    }
    
    /**
     * @description Test getTags method
     */
    @isTest
    static void testGetTags() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[' +
            '{' +
                '"name": "v1.0.0",' +
                '"commit": { "sha": "tag123" }' +
            '}' +
        ']';
        
        Test.startTest();
        List<GitHubService.Branch> tags = GitHubService.getTags('testuser', 'test-repo');
        Test.stopTest();
        
        System.assertEquals(1, tags.size(), 'Should return 1 tag');
        System.assertEquals('v1.0.0', tags[0].name, 'Tag name should match');
    }
    
    /**
     * @description Test getTree method
     */
    @isTest
    static void testGetTree() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '{' +
            '"sha": "tree123",' +
            '"tree": [' +
                '{' +
                    '"path": "docs",' +
                    '"type": "tree",' +
                    '"sha": "dir123"' +
                '},' +
                '{' +
                    '"path": "docs/intro.md",' +
                    '"type": "blob",' +
                    '"sha": "file123",' +
                    '"size": 1024' +
                '},' +
                '{' +
                    '"path": "README.md",' +
                    '"type": "blob",' +
                    '"sha": "readme123",' +
                    '"size": 256' +
                '}' +
            ']' +
        '}';
        
        Test.startTest();
        List<GitHubService.TreeItem> items = GitHubService.getTree('testuser', 'test-repo', 'main', true);
        Test.stopTest();
        
        System.assertEquals(3, items.size(), 'Should return 3 tree items');
        System.assertEquals('docs', items[0].path, 'First item path should match');
        System.assertEquals('tree', items[0].type, 'First item should be a tree (directory)');
        System.assertEquals('blob', items[1].type, 'Second item should be a blob (file)');
        System.assertEquals(1024, items[1].size, 'Second item size should match');
    }
    
    /**
     * @description Test getContents method for a single file
     */
    @isTest
    static void testGetContents_SingleFile() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        // "# Hello World" base64 encoded is "IyBIZWxsbyBXb3JsZA=="
        GitHubService.testHttpResponse = '{' +
            '"name": "README.md",' +
            '"path": "README.md",' +
            '"sha": "abc123",' +
            '"size": 13,' +
            '"encoding": "base64",' +
            '"content": "IyBIZWxsbyBXb3JsZA==",' +
            '"download_url": "https://raw.githubusercontent.com/testuser/test-repo/main/README.md"' +
        '}';
        
        Test.startTest();
        List<GitHubService.FileContent> contents = GitHubService.getContents('testuser', 'test-repo', 'README.md', 'main');
        Test.stopTest();
        
        System.assertEquals(1, contents.size(), 'Should return 1 file');
        System.assertEquals('README.md', contents[0].name, 'File name should match');
        System.assertEquals('# Hello World', contents[0].content, 'Content should be decoded');
    }
    
    /**
     * @description Test getContents method for a directory
     */
    @isTest
    static void testGetContents_Directory() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[' +
            '{' +
                '"name": "intro.md",' +
                '"path": "docs/intro.md",' +
                '"sha": "file1",' +
                '"size": 500,' +
                '"download_url": "https://raw.githubusercontent.com/testuser/test-repo/main/docs/intro.md"' +
            '},' +
            '{' +
                '"name": "setup.md",' +
                '"path": "docs/setup.md",' +
                '"sha": "file2",' +
                '"size": 750,' +
                '"download_url": "https://raw.githubusercontent.com/testuser/test-repo/main/docs/setup.md"' +
            '}' +
        ']';
        
        Test.startTest();
        List<GitHubService.FileContent> contents = GitHubService.getContents('testuser', 'test-repo', 'docs', 'main');
        Test.stopTest();
        
        System.assertEquals(2, contents.size(), 'Should return 2 files');
        System.assertEquals('intro.md', contents[0].name, 'First file name should match');
        System.assertEquals('docs/setup.md', contents[1].path, 'Second file path should match');
    }
    
    /**
     * @description Test getFileContent method
     */
    @isTest
    static void testGetFileContent() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        // "Test content" base64 encoded
        GitHubService.testHttpResponse = '{' +
            '"name": "test.md",' +
            '"path": "test.md",' +
            '"sha": "xyz789",' +
            '"size": 12,' +
            '"encoding": "base64",' +
            '"content": "VGVzdCBjb250ZW50"' +
        '}';
        
        Test.startTest();
        String content = GitHubService.getFileContent('testuser', 'test-repo', 'test.md', 'main');
        Test.stopTest();
        
        System.assertEquals('Test content', content, 'Content should be decoded correctly');
    }
    
    /**
     * @description Test filterTreeByPath method
     */
    @isTest
    static void testFilterTreeByPath() {
        List<GitHubService.TreeItem> items = new List<GitHubService.TreeItem>();
        
        GitHubService.TreeItem item1 = new GitHubService.TreeItem();
        item1.path = 'docs/intro.md';
        item1.type = 'blob';
        items.add(item1);
        
        GitHubService.TreeItem item2 = new GitHubService.TreeItem();
        item2.path = 'docs/advanced/setup.md';
        item2.type = 'blob';
        items.add(item2);
        
        GitHubService.TreeItem item3 = new GitHubService.TreeItem();
        item3.path = 'src/main.js';
        item3.type = 'blob';
        items.add(item3);
        
        Test.startTest();
        List<GitHubService.TreeItem> filtered = GitHubService.filterTreeByPath(items, 'docs');
        Test.stopTest();
        
        System.assertEquals(2, filtered.size(), 'Should return 2 items under docs/');
        System.assertEquals('docs/intro.md', filtered[0].path, 'First item should be docs/intro.md');
    }
    
    /**
     * @description Test filterMarkdownFiles method
     */
    @isTest
    static void testFilterMarkdownFiles() {
        List<GitHubService.TreeItem> items = new List<GitHubService.TreeItem>();
        
        GitHubService.TreeItem item1 = new GitHubService.TreeItem();
        item1.path = 'README.md';
        item1.type = 'blob';
        items.add(item1);
        
        GitHubService.TreeItem item2 = new GitHubService.TreeItem();
        item2.path = 'src/main.js';
        item2.type = 'blob';
        items.add(item2);
        
        GitHubService.TreeItem item3 = new GitHubService.TreeItem();
        item3.path = 'docs';
        item3.type = 'tree';
        items.add(item3);
        
        GitHubService.TreeItem item4 = new GitHubService.TreeItem();
        item4.path = 'docs/GUIDE.MD';
        item4.type = 'blob';
        items.add(item4);
        
        Test.startTest();
        List<GitHubService.TreeItem> filtered = GitHubService.filterMarkdownFiles(items);
        Test.stopTest();
        
        System.assertEquals(2, filtered.size(), 'Should return 2 markdown files');
        System.assertEquals('README.md', filtered[0].path, 'First file should be README.md');
        System.assertEquals('docs/GUIDE.MD', filtered[1].path, 'Second file should be docs/GUIDE.MD (case insensitive)');
    }
    
    /**
     * @description Test GitHubException class
     */
    @isTest
    static void testGitHubException() {
        Test.startTest();
        GitHubService.GitHubException ex = new GitHubService.GitHubException('Test error');
        System.assertEquals('Test error', ex.getMessage(), 'Exception message should match');
        Test.stopTest();
    }
    
    /**
     * @description Test isConfigured returns true when token is set
     */
    @isTest
    static void testIsConfigured_True() {
        GitHubService.testAccessToken = 'test-token';
        
        Test.startTest();
        Boolean isConfigured = GitHubService.isConfigured();
        Test.stopTest();
        
        System.assertEquals(true, isConfigured, 'Should return true when test token is set');
    }
    
    /**
     * @description Test isConfigured returns false when using ExternalCredentialService check
     */
    @isTest
    static void testIsConfigured_False() {
        GitHubService.testAccessToken = null;
        ExternalCredentialService.testCredentialValues = new Map<String, String>();
        
        Test.startTest();
        Boolean isConfigured = GitHubService.isConfigured();
        Test.stopTest();
        
        System.assertEquals(false, isConfigured, 'Should return false when no credentials');
    }
    
    /**
     * @description Test setAccessToken stores token via ExternalCredentialService
     */
    @isTest
    static void testSetAccessToken() {
        Test.startTest();
        GitHubService.setAccessToken('ghp_newtoken123');
        String token = ExternalCredentialService.getPAT(GitHubService.EXTERNAL_CREDENTIAL_NAME, GitHubService.PRINCIPAL_NAME);
        Test.stopTest();
        
        System.assertEquals('ghp_newtoken123', token, 'Token should be stored');
    }
    
    /**
     * @description Test setAccessToken throws exception for blank token
     */
    @isTest
    static void testSetAccessToken_Blank() {
        Test.startTest();
        try {
            GitHubService.setAccessToken('');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('cannot be blank'), 'Should indicate blank token error');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test testTokenDirectly method - tests a token without saving
     */
    @isTest
    static void testTestTokenDirectly() {
        GitHubService.testHttpStatusCode = 200;
        GitHubService.testHttpResponse = '[' +
            '{' +
                '"id": 123456,' +
                '"name": "test-repo",' +
                '"full_name": "testuser/test-repo",' +
                '"description": "A test repository",' +
                '"default_branch": "main",' +
                '"private": false,' +
                '"owner": { "login": "testuser" }' +
            '}' +
        ']';
        
        Test.startTest();
        List<GitHubService.Repository> repos = GitHubService.testTokenDirectly('ghp_testtoken');
        Test.stopTest();
        
        System.assertEquals(1, repos.size(), 'Should return 1 repository');
        System.assertEquals('test-repo', repos[0].name, 'Repo name should match');
    }
    
    /**
     * @description Test testTokenDirectly with blank token
     */
    @isTest
    static void testTestTokenDirectly_BlankToken() {
        Test.startTest();
        try {
            GitHubService.testTokenDirectly('');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('cannot be blank'), 'Should indicate blank token error');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test testTokenDirectly with API error
     */
    @isTest
    static void testTestTokenDirectly_Error() {
        GitHubService.testHttpStatusCode = 401;
        GitHubService.testHttpResponse = '{"message": "Bad credentials"}';
        
        Test.startTest();
        try {
            GitHubService.testTokenDirectly('bad-token');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('Failed to list repositories'), 'Error message should indicate failure');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getBranchesWithToken - now returns main + tags
     */
    @isTest
    static void testGetBranchesWithToken() {
        GitHubService.testHttpStatusCode = 200;
        // Mock tags response
        GitHubService.testHttpResponse = '[' +
            '{' +
                '"name": "v2.0.0",' +
                '"commit": { "sha": "abc123" }' +
            '},' +
            '{' +
                '"name": "v1.0.0",' +
                '"commit": { "sha": "def456" }' +
            '}' +
        ']';
        
        Test.startTest();
        List<GitHubService.Branch> refs = GitHubService.getBranchesWithToken('ghp_testtoken', 'testuser', 'test-repo');
        Test.stopTest();
        
        // Should have main + 2 tags = 3 total
        System.assertEquals(3, refs.size(), 'Should return main + 2 tags');
        System.assertEquals('main', refs[0].name, 'First ref should be main');
        System.assertEquals('v2.0.0', refs[1].name, 'Second ref should be first tag');
    }
    
    /**
     * @description Test getBranchesWithToken with blank token
     */
    @isTest
    static void testGetBranchesWithToken_BlankToken() {
        Test.startTest();
        try {
            GitHubService.getBranchesWithToken('', 'testuser', 'test-repo');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('cannot be blank'), 'Should indicate blank token error');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getBranches with API error (tags endpoint fails)
     */
    @isTest
    static void testGetBranches_TagsError() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 404;
        GitHubService.testHttpResponse = '{"message": "Not Found"}';
        
        Test.startTest();
        try {
            GitHubService.getBranches('testuser', 'nonexistent-repo');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('Failed to get tags'), 'Error message should indicate tags failure');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getReleases with API error
     */
    @isTest
    static void testGetReleases_Error() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 500;
        GitHubService.testHttpResponse = '{"message": "Server Error"}';
        
        Test.startTest();
        try {
            GitHubService.getReleases('testuser', 'test-repo');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('Failed to get releases'), 'Error message should indicate releases failure');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getTags with API error
     */
    @isTest
    static void testGetTags_Error() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 403;
        GitHubService.testHttpResponse = '{"message": "Forbidden"}';
        
        Test.startTest();
        try {
            GitHubService.getTags('testuser', 'test-repo');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('Failed to get tags'), 'Error message should indicate tags failure');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getTree with API error
     */
    @isTest
    static void testGetTree_Error() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 404;
        GitHubService.testHttpResponse = '{"message": "Not Found"}';
        
        Test.startTest();
        try {
            GitHubService.getTree('testuser', 'test-repo', 'nonexistent-branch', true);
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('Failed to get tree'), 'Error message should indicate tree failure');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getContents with API error
     */
    @isTest
    static void testGetContents_Error() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 404;
        GitHubService.testHttpResponse = '{"message": "Not Found"}';
        
        Test.startTest();
        try {
            GitHubService.getContents('testuser', 'test-repo', 'nonexistent-path', 'main');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('Failed to get contents'), 'Error message should indicate contents failure');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getFileContent with file not found
     */
    @isTest
    static void testGetFileContent_NotFound() {
        GitHubService.testAccessToken = 'test-token';
        GitHubService.testHttpStatusCode = 200;
        // Return empty array (no files)
        GitHubService.testHttpResponse = '[]';
        
        Test.startTest();
        try {
            GitHubService.getFileContent('testuser', 'test-repo', 'nonexistent.md', 'main');
            System.assert(false, 'Should have thrown GitHubException');
        } catch (GitHubService.GitHubException e) {
            System.assert(e.getMessage().contains('File not found'), 'Error message should indicate file not found');
        }
        Test.stopTest();
    }
    
    /**
     * @description Test getAccessToken when no test override and ConnectApi throws
     */
    @isTest
    static void testGetAccessToken_NoOverride() {
        // Don't set testAccessToken - this will force the real code path
        // which will fail because ConnectApi throws in test context
        GitHubService.testAccessToken = null;
        
        Test.startTest();
        try {
            // Calling getBranches without testAccessToken will try real credential lookup
            GitHubService.getBranches('testuser', 'test-repo');
            System.assert(false, 'Should have thrown exception');
        } catch (GitHubService.GitHubException e) {
            // This tests line 98 - the exception path
            System.assert(e.getMessage().contains('credentials') || e.getMessage().contains('GitHub'), 
                'Should have error about credentials');
        }
        Test.stopTest();
    }
}
