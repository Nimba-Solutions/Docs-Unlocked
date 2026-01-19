public class PermissionChecker {
    
    /**
     * Check if current user has a standard permission
     */
    @AuraEnabled(cacheable=true)
    public static Boolean hasPermission(String permissionName) {
        try {
            return FeatureManagement.checkPermission(permissionName);
        } catch (Exception e) {
            System.debug('Error checking permission: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if current user has a custom permission
     */
    @AuraEnabled(cacheable=true)
    public static Boolean hasCustomPermission(String permissionName) {
        try {
            return FeatureManagement.checkPermission(permissionName);
        } catch (Exception e) {
            System.debug('Error checking custom permission: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if current user has a permission set assigned
     */
    @AuraEnabled(cacheable=true)
    public static Boolean hasPermissionSet(String permissionSetName) {
        try {
            List<PermissionSetAssignment> assignments = [
                SELECT Id 
                FROM PermissionSetAssignment 
                WHERE AssigneeId = :UserInfo.getUserId()
                AND PermissionSet.Name = :permissionSetName
                LIMIT 1
            ];
            return !assignments.isEmpty();
        } catch (Exception e) {
            System.debug('Error checking permission set: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if current user has a specific profile
     */
    @AuraEnabled(cacheable=true)
    public static Boolean hasProfile(String profileName) {
        try {
            Profile userProfile = [
                SELECT Name 
                FROM Profile 
                WHERE Id = :UserInfo.getProfileId()
                LIMIT 1
            ];
            return userProfile.Name == profileName;
        } catch (Exception e) {
            System.debug('Error checking profile: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if current user has access to an object
     */
    @AuraEnabled(cacheable=true)
    public static Boolean hasObjectAccess(String objectName, String accessType) {
        try {
            Schema.DescribeSObjectResult objDesc = Schema.describeSObjects(new String[]{objectName})[0];
            
            switch on accessType.toLowerCase() {
                when 'read' {
                    return objDesc.isAccessible();
                }
                when 'create' {
                    return objDesc.isCreateable();
                }
                when 'edit', 'update' {
                    return objDesc.isUpdateable();
                }
                when 'delete' {
                    return objDesc.isDeletable();
                }
                when 'viewall' {
                    return objDesc.isAccessible() && objDesc.isQueryable();
                }
                when 'modifyall' {
                    return objDesc.isUpdateable() && objDesc.isDeletable();
                }
                when else {
                    // Default to read access
                    return objDesc.isAccessible();
                }
            }
        } catch (Exception e) {
            System.debug('Error checking object access: ' + e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if current user has access to a field
     */
    @AuraEnabled(cacheable=true)
    public static Boolean hasFieldAccess(String fieldName) {
        try {
            // Field name format: ObjectName.FieldName or ObjectName__c.FieldName__c
            List<String> parts = fieldName.split('\\.');
            if (parts.size() != 2) {
                return false;
            }
            
            String objectName = parts[0];
            String fieldApiName = parts[1];
            
            Schema.SObjectType objType = Schema.getGlobalDescribe().get(objectName);
            if (objType == null) {
                return false;
            }
            
            Schema.DescribeSObjectResult objDesc = objType.getDescribe();
            Schema.DescribeFieldResult fieldDesc = objDesc.fields.getMap().get(fieldApiName)?.getDescribe();
            
            if (fieldDesc == null) {
                return false;
            }
            
            return fieldDesc.isAccessible();
        } catch (Exception e) {
            System.debug('Error checking field access: ' + e.getMessage());
            return false;
        }
    }
}
