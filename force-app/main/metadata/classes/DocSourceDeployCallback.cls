/**
 * @description Callback class for Doc_Source__mdt custom metadata deployments.
 */
public class DocSourceDeployCallback implements Metadata.DeployCallback {
    
    /** @description Logs deployment result */
    @TestVisible
    private static void logResult(Boolean isSuccess, Id jobId, String errorMessage) {
        if (isSuccess) {
            System.debug('Doc Source deployment succeeded. Job ID: ' + jobId);
        } else {
            System.debug('Doc Source deployment failed.');
            if (errorMessage != null) {
                System.debug('Error: ' + errorMessage);
            }
        }
    }
    
    /** @description Called when the metadata deployment completes. */
    public void handleResult(Metadata.DeployResult result, Metadata.DeployCallbackContext context) {
        logResult(result.status == Metadata.DeployStatus.Succeeded, result.id, result.errorMessage);
    }
}
