/**
 * @description Callback class for Doc_Source__mdt custom metadata deployments.
 * Handles deployment completion notifications.
 */
public class DocSourceDeployCallback implements Metadata.DeployCallback {
    
    /**
     * @description Called when the metadata deployment completes.
     * @param result The deployment result
     * @param context The callback context
     */
    public void handleResult(Metadata.DeployResult result, Metadata.DeployCallbackContext context) {
        if (result.status == Metadata.DeployStatus.Succeeded) {
            System.debug('Doc Source deployment succeeded. Job ID: ' + result.id);
        } else {
            System.debug('Doc Source deployment failed. Status: ' + result.status);
            if (result.errorMessage != null) {
                System.debug('Error: ' + result.errorMessage);
            }
        }
    }
}
