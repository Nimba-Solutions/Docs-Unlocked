import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getDocSources from '@salesforce/apex/DocSourceAdminController.getDocSources';
import saveDocSource from '@salesforce/apex/DocSourceAdminController.saveDocSource';
import deleteDocSource from '@salesforce/apex/DocSourceAdminController.deleteDocSource';
import validateDocSource from '@salesforce/apex/DocSourceAdminController.validateDocSource';
import ensureCredential from '@salesforce/apex/DocSourceAdminController.ensureCredential';
import saveCredentialToken from '@salesforce/apex/DocSourceAdminController.saveCredentialToken';
import testCredential from '@salesforce/apex/DocSourceAdminController.testCredential';
import getRepositoriesForCredential from '@salesforce/apex/DocSourceAdminController.getRepositoriesForCredential';
import getBranchesForCredential from '@salesforce/apex/DocSourceAdminController.getBranchesForCredential';
import checkDeploymentStatus from '@salesforce/apex/DocSourceAdminController.checkDeploymentStatus';

export default class DocsUnlockedAdmin extends LightningElement {
    @track isTestingToken = false;
    @track tokenTestResult = null;
    @track credentialVerified = false;
    @track currentTestStep = ''; // Shows which step is running

    @track docSources = [];
    @track isLoadingSources = true;
    @track wiredSourcesResult;

    @track showForm = false;
    @track isEditing = false;
    @track isSaving = false;
    @track isValidating = false;
    @track validationResult = null;
    @track formData = this.getEmptyFormData();
    @track deploymentStatus = null;

    @track repositories = [];
    @track branches = [];
    @track isLoadingRepos = false;
    @track isLoadingBranches = false;

    providerOptions = [
        { label: 'GitHub', value: 'GitHub' },
        { label: 'Static Resource (coming soon)', value: 'StaticResource', disabled: true }
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
        this.currentTestStep = '';
        
        try {
            // Step 1: Ensure External Credential exists (may create it)
            this.currentTestStep = 'Step 1/3: Creating external credential...';
            let ensureResult;
            try {
                ensureResult = await ensureCredential({ 
                    credentialName: this.formData.credentialName
                });
            } catch (e) {
                throw new Error('Step 1 failed: ' + (e.body?.message || e.message));
            }
            
            if (!ensureResult.success) {
                this.tokenTestResult = ensureResult;
                this.showToast('Error', ensureResult.message, 'error');
                this.isTestingToken = false;
                this.currentTestStep = '';
                return;
            }
            
            // Step 2: Save the token value (separate transaction)
            this.currentTestStep = 'Step 2/3: Saving token...';
            let saveResult;
            try {
                saveResult = await saveCredentialToken({ 
                    credentialName: this.formData.credentialName, 
                    token: this.formData.token 
                });
            } catch (e) {
                throw new Error('Step 2 failed: ' + (e.body?.message || e.message));
            }
            
            if (!saveResult.success) {
                this.tokenTestResult = saveResult;
                this.showToast('Error', saveResult.message, 'error');
                this.isTestingToken = false;
                this.currentTestStep = '';
                return;
            }
            
            // Step 3: Test the connection (separate callout transaction)
            this.currentTestStep = 'Step 3/3: Testing connection to GitHub...';
            let testResult;
            try {
                testResult = await testCredential({ 
                    credentialName: this.formData.credentialName
                });
            } catch (e) {
                throw new Error('Step 3 failed: ' + (e.body?.message || e.message));
            }
            
            this.tokenTestResult = testResult;
            if (testResult.success) {
                this.credentialVerified = true;
                this.showToast('Success', testResult.message, 'success');
            } else {
                this.showToast('Error', testResult.message, 'error');
            }
        } catch (error) {
            this.tokenTestResult = { success: false, message: error.body?.message || error.message || String(error) };
            this.showToast('Error', 'Test failed: ' + (error.body?.message || error.message || String(error)), 'error');
        }
        this.isTestingToken = false;
        this.currentTestStep = '';
    }

    handleNewSource() {
        this.formData = this.getEmptyFormData();
        this.isEditing = false;
        this.validationResult = null;
        this.tokenTestResult = null;
        this.credentialVerified = false;
        this.repositories = [];
        this.branches = [];
        this.deploymentStatus = null;
        this.showForm = true;
    }

    handleEditSource(event) {
        const developerName = event.target.dataset.developerName;
        const source = this.docSources.find(s => s.developerName === developerName);
        if (source) {
            this.formData = { ...source, token: '' };
            this.isEditing = true;
            this.validationResult = null;
            this.tokenTestResult = null;
            this.credentialVerified = true;
            this.repositories = [];
            this.branches = [];
            this.deploymentStatus = null;
            this.showForm = true;
            
            if (this.formData.repositoryOwner && this.formData.repositoryName) {
                this.loadBranches();
            }
        }
    }

    async handleDeleteSource(event) {
        const developerName = event.target.dataset.developerName;
        const source = this.docSources.find(s => s.developerName === developerName);
        if (!source) return;

        if (!confirm('Deactivate "' + source.name + '"? This will hide it from the application.')) {
            return;
        }

        try {
            const result = await deleteDocSource({ developerName: developerName });
            this.showToast('Info', 'Deactivating doc source...', 'info');
            
            // Poll for deployment completion
            await this.pollDeploymentStatus(result.jobId);
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
        this.deploymentStatus = null;
    }

    handleFormChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        
        let updates = { [field]: value };
        
        // Auto-populate Developer Name from Label (spaces -> underscores, lowercase)
        if (field === 'name' && !this.isEditing) {
            updates.developerName = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        }
        
        this.formData = { ...this.formData, ...updates };
        this.validationResult = null;
        
        if (field === 'credentialName' || field === 'token') {
            this.tokenTestResult = null;
            if (!this.isEditing) {
                this.credentialVerified = false;
            }
        }
    }

    async handleLoadRepositories() {
        if (!this.formData.credentialName) {
            this.showToast('Error', 'Credential name is required', 'error');
            return;
        }
        
        this.isLoadingRepos = true;
        try {
            // Credential should already be saved after Test Connection
            this.repositories = await getRepositoriesForCredential({ credentialName: this.formData.credentialName });
            
            if (this.repositories.length === 0) {
                this.showToast('Info', 'No repositories found. Check your token permissions.', 'info');
            }
        } catch (error) {
            this.showToast('Error', 'Failed to load repositories: ' + (error.body?.message || error.message), 'error');
            this.repositories = [];
        }
        this.isLoadingRepos = false;
    }

    handleRepoSelect(event) {
        const repoFullName = event.target.value;
        const repo = this.repositories.find(r => r.fullName === repoFullName);
        if (repo) {
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
            // Credential should already be saved after Test Connection
            this.branches = await getBranchesForCredential({ 
                credentialName: this.formData.credentialName,
                owner: this.formData.repositoryOwner, 
                repo: this.formData.repositoryName 
            });
        } catch (error) {
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
        const required = ['name', 'developerName', 'credentialName', 'provider', 'repositoryOwner', 'repositoryName', 'defaultRef'];
        for (const field of required) {
            if (!this.formData[field]) {
                this.showToast('Error', 'Please fill in all required fields', 'error');
                return;
            }
        }

        if (!this.isEditing && !this.formData.token) {
            this.showToast('Error', 'Token is required for new doc sources', 'error');
            return;
        }

        this.isSaving = true;
        
        try {
            // Step 1: Save credential token first (separate transaction)
            if (this.formData.token) {
                this.deploymentStatus = { message: 'Saving credential...', status: 'InProgress' };
                const tokenResult = await saveCredentialToken({ 
                    credentialName: this.formData.credentialName, 
                    token: this.formData.token 
                });
                if (!tokenResult.success) {
                    this.showToast('Error', 'Failed to save credential: ' + tokenResult.message, 'error');
                    this.isSaving = false;
                    this.deploymentStatus = null;
                    return;
                }
            }
            
            // Step 2: Deploy metadata (separate transaction)
            this.deploymentStatus = { message: 'Deploying metadata...', status: 'InProgress' };
            const result = await saveDocSource({ sourceData: this.formData });
            
            if (result.success && result.jobId) {
                // Poll for deployment completion
                const finalStatus = await this.pollDeploymentStatus(result.jobId);
                
                if (finalStatus.success) {
                    this.showToast('Success', 'Doc source saved successfully', 'success');
                    this.showForm = false;
                    this.formData = this.getEmptyFormData();
                    this.credentialVerified = false;
                    this.repositories = [];
                    this.branches = [];
                    await refreshApex(this.wiredSourcesResult);
                } else {
                    this.showToast('Error', 'Deployment failed: ' + finalStatus.message, 'error');
                }
            } else {
                this.showToast('Error', result.message || 'Unknown error', 'error');
            }
        } catch (error) {
            this.showToast('Error', 'Failed to save: ' + (error.body?.message || error.message), 'error');
        }
        this.isSaving = false;
        this.deploymentStatus = null;
    }

    async pollDeploymentStatus(jobId) {
        const maxAttempts = 30;
        const pollInterval = 2000; // 2 seconds
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const status = await checkDeploymentStatus({ jobId: jobId });
                this.deploymentStatus = status;
                
                if (status.done) {
                    return status;
                }
                
                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            } catch (error) {
                console.error('Error polling deployment status:', error);
                return { done: true, success: false, message: error.body?.message || error.message };
            }
        }
        
        return { done: true, success: false, message: 'Deployment timed out' };
    }

    getEmptyFormData() {
        return {
            developerName: '',
            name: '',
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
        return this.isGitHubProvider && (this.isEditing || this.credentialVerified);
    }

    get canBrowseRepositories() {
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

    get isDeploying() {
        return this.deploymentStatus && !this.deploymentStatus.done;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
