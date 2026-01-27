import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getDocSources from '@salesforce/apex/DocSourceAdminController.getDocSources';
import saveDocSourceWithToken from '@salesforce/apex/DocSourceAdminController.saveDocSourceWithToken';
import deleteDocSource from '@salesforce/apex/DocSourceAdminController.deleteDocSource';
import validateDocSource from '@salesforce/apex/DocSourceAdminController.validateDocSource';
import testCredential from '@salesforce/apex/DocSourceAdminController.testCredential';
import getRepositoriesForCredential from '@salesforce/apex/DocSourceAdminController.getRepositoriesForCredential';
import getBranchesForCredential from '@salesforce/apex/DocSourceAdminController.getBranchesForCredential';

export default class DocsUnlockedAdmin extends LightningElement {
    // Token test state
    @track isTestingToken = false;
    @track tokenTestResult = null;
    @track credentialVerified = false;

    // Doc sources state
    @track docSources = [];
    @track isLoadingSources = true;
    @track wiredSourcesResult;

    // Form state
    @track showForm = false;
    @track isEditing = false;
    @track isSaving = false;
    @track isValidating = false;
    @track validationResult = null;
    @track formData = this.getEmptyFormData();

    // Repository browser
    @track repositories = [];
    @track branches = [];
    @track isLoadingRepos = false;
    @track isLoadingBranches = false;

    providerOptions = [
        { label: 'GitHub', value: 'GitHub' },
        { label: 'GitLab (coming soon)', value: 'GitLab', disabled: true },
        { label: 'Bitbucket (coming soon)', value: 'Bitbucket', disabled: true },
        { label: 'Azure DevOps (coming soon)', value: 'Azure DevOps', disabled: true }
    ];

    @wire(getDocSources)
    wiredSources(result) {
        this.wiredSourcesResult = result;
        if (result.data) {
            this.docSources = result.data;
            this.isLoadingSources = false;
        } else if (result.error) {
            this.showToast('Error', 'Failed to load doc sources: ' + result.error.body?.message, 'error');
            this.isLoadingSources = false;
        }
    }

    async handleTestToken() {
        if (!this.formData.credentialName) {
            this.showToast('Error', 'Enter a credential name first', 'error');
            return;
        }
        if (!this.formData.token) {
            this.showToast('Error', 'Enter a token to test', 'error');
            return;
        }

        this.isTestingToken = true;
        this.tokenTestResult = null;
        this.credentialVerified = false;
        
        try {
            const result = await testCredential({ 
                credentialName: this.formData.credentialName, 
                token: this.formData.token 
            });
            this.tokenTestResult = result;
            if (result.success) {
                this.credentialVerified = true;
                this.showToast('Success', result.message, 'success');
            } else {
                this.showToast('Error', result.message, 'error');
            }
        } catch (error) {
            this.tokenTestResult = { success: false, message: error.body?.message || error.message };
            this.showToast('Error', 'Test failed: ' + (error.body?.message || error.message), 'error');
        }
        this.isTestingToken = false;
    }

    handleNewSource() {
        this.formData = this.getEmptyFormData();
        this.isEditing = false;
        this.validationResult = null;
        this.tokenTestResult = null;
        this.credentialVerified = false;
        this.repositories = [];
        this.branches = [];
        this.showForm = true;
    }

    handleEditSource(event) {
        const sourceId = event.target.dataset.id;
        const source = this.docSources.find(s => s.id === sourceId);
        if (source) {
            this.formData = { ...source, token: '' }; // Don't prefill token
            this.isEditing = true;
            this.validationResult = null;
            this.tokenTestResult = null;
            this.credentialVerified = true; // Already has credential saved
            this.repositories = [];
            this.branches = [];
            this.showForm = true;
            
            // Try to load branches for the existing repo
            if (this.formData.repositoryOwner && this.formData.repositoryName) {
                this.loadBranches();
            }
        }
    }

    async handleDeleteSource(event) {
        const sourceId = event.target.dataset.id;
        const source = this.docSources.find(s => s.id === sourceId);
        if (!source) return;

        if (!confirm('Delete "' + source.name + '"? This cannot be undone.')) {
            return;
        }

        try {
            await deleteDocSource({ recordId: sourceId });
            this.showToast('Success', 'Doc source deleted', 'success');
            await refreshApex(this.wiredSourcesResult);
        } catch (error) {
            this.showToast('Error', 'Failed to delete: ' + (error.body?.message || error.message), 'error');
        }
    }

    handleCancelForm() {
        this.showForm = false;
        this.formData = this.getEmptyFormData();
        this.validationResult = null;
        this.tokenTestResult = null;
        this.credentialVerified = false;
        this.repositories = [];
        this.branches = [];
    }

    handleFormChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        this.formData = { ...this.formData, [field]: value };
        this.validationResult = null;

        // Auto-populate name and credentialName from app identifier
        if (field === 'appIdentifier' && !this.isEditing) {
            this.formData.name = value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (!this.formData.credentialName) {
                this.formData.credentialName = value;
            }
        }
        
        // Reset credential verification if credential name or token changes
        if (field === 'credentialName' || field === 'token') {
            this.tokenTestResult = null;
            if (!this.isEditing) {
                this.credentialVerified = false;
            }
        }
    }

    async handleLoadRepositories() {
        if (!this.formData.credentialName) return;
        
        this.isLoadingRepos = true;
        try {
            this.repositories = await getRepositoriesForCredential({ credentialName: this.formData.credentialName });
            if (this.repositories.length === 0) {
                this.showToast('Info', 'No repositories found. Check your token permissions.', 'info');
            }
        } catch (error) {
            console.warn('Failed to load repositories:', error);
            this.showToast('Error', 'Failed to load repositories: ' + (error.body?.message || error.message), 'error');
            this.repositories = [];
        }
        this.isLoadingRepos = false;
    }

    handleRepoSelect(event) {
        const repoFullName = event.target.value;
        const repo = this.repositories.find(r => r.fullName === repoFullName);
        if (repo) {
            // repo.owner is a string (the login), not an object
            this.formData = {
                ...this.formData,
                repositoryOwner: repo.owner,
                repositoryName: repo.name,
                defaultRef: repo.defaultBranch || 'main'
            };
            this.loadBranches();
        }
    }

    handleBranchSelect(event) {
        this.formData = { ...this.formData, defaultRef: event.target.value };
    }

    async loadBranches() {
        if (!this.formData.repositoryOwner || !this.formData.repositoryName || !this.formData.credentialName) return;
        
        this.isLoadingBranches = true;
        try {
            this.branches = await getBranchesForCredential({ 
                credentialName: this.formData.credentialName,
                owner: this.formData.repositoryOwner, 
                repo: this.formData.repositoryName 
            });
        } catch (error) {
            console.warn('Failed to load branches:', error);
            this.branches = [];
        }
        this.isLoadingBranches = false;
    }

    async handleValidate() {
        this.isValidating = true;
        this.validationResult = null;
        try {
            const result = await validateDocSource({ sourceData: this.formData });
            this.validationResult = result;
            if (result.valid) {
                this.showToast('Success', result.message, 'success');
            } else {
                this.showToast('Warning', result.message, 'warning');
            }
        } catch (error) {
            this.validationResult = { valid: false, message: error.body?.message || error.message };
            this.showToast('Error', 'Validation failed: ' + (error.body?.message || error.message), 'error');
        }
        this.isValidating = false;
    }

    async handleSaveSource() {
        // Validate required fields
        const required = ['name', 'appIdentifier', 'credentialName', 'provider', 'repositoryOwner', 'repositoryName', 'defaultRef'];
        for (const field of required) {
            if (!this.formData[field]) {
                this.showToast('Error', 'Please fill in all required fields', 'error');
                return;
            }
        }

        // For new sources, token is required
        if (!this.isEditing && !this.formData.token) {
            this.showToast('Error', 'Token is required for new doc sources', 'error');
            return;
        }

        this.isSaving = true;
        try {
            await saveDocSourceWithToken({ 
                sourceData: this.formData, 
                token: this.formData.token || null
            });
            this.showToast('Success', 'Doc source saved successfully', 'success');
            this.showForm = false;
            this.formData = this.getEmptyFormData();
            this.credentialVerified = false;
            this.repositories = [];
            this.branches = [];
            await refreshApex(this.wiredSourcesResult);
        } catch (error) {
            this.showToast('Error', 'Failed to save: ' + (error.body?.message || error.message), 'error');
        }
        this.isSaving = false;
    }

    getEmptyFormData() {
        return {
            id: null,
            name: '',
            appIdentifier: '',
            credentialName: '',
            provider: 'GitHub',
            repositoryOwner: '',
            repositoryName: '',
            contentPath: '',
            defaultRef: 'main',
            isActive: true,
            allowVersionSwitching: false,
            description: '',
            token: ''
        };
    }

    get repositoryOptions() {
        return this.repositories.map(r => ({ label: r.fullName, value: r.fullName }));
    }

    get branchOptions() {
        return this.branches.map(b => ({ label: b.name, value: b.name }));
    }

    get hasDocSources() {
        return this.docSources && this.docSources.length > 0;
    }

    get hasRepositories() {
        return this.repositories && this.repositories.length > 0;
    }

    get hasBranches() {
        return this.branches && this.branches.length > 0;
    }

    get isGitHubProvider() {
        return this.formData.provider === 'GitHub';
    }

    get isNewSource() {
        return !this.isEditing;
    }

    get showRepositorySection() {
        // Show repository section when:
        // - Editing an existing source (credential already saved)
        // - Or credential has been verified for a new source
        return this.isGitHubProvider && (this.isEditing || this.credentialVerified);
    }

    get canBrowseRepositories() {
        // Can browse repos if we have a credential name and either:
        // - It's been verified with a token
        // - We're editing (credential already exists)
        return this.formData.credentialName && (this.credentialVerified || this.isEditing);
    }

    get formTitle() {
        return this.isEditing ? 'Edit Doc Source' : 'New Doc Source';
    }

    get tokenTestResultClass() {
        return this.tokenTestResult?.success 
            ? 'slds-box slds-theme_success slds-m-top_small' 
            : 'slds-box slds-theme_error slds-m-top_small';
    }

    get validationResultClass() {
        return this.validationResult?.valid 
            ? 'slds-box slds-theme_success slds-m-top_medium' 
            : 'slds-box slds-theme_warning slds-m-top_medium';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
