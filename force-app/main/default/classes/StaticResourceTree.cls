public class StaticResourceTree {
    
    /**
     * Returns nested Map structure of ZIP contents
     */
    public static Map<String, Object> getTree(String resourceName) {
        StaticResource sr = [
            SELECT Body FROM StaticResource 
            WHERE Name = :resourceName LIMIT 1
        ];
        
        Compression.ZipReader reader = new Compression.ZipReader(sr.Body);
        List<Compression.ZipEntry> entries = reader.getEntries();
        
        Map<String, Object> root = new Map<String, Object>();
        
        for (Compression.ZipEntry entry : entries) {
            String name = entry.getName();
            // Skip directories (they end with /)
            if (!name.endsWith('/')) {
                addPath(root, name);
            }
        }
        
        return root;
    }
    
    /**
     * Returns JSON string of the tree
     */
    public static String getTreeAsJson(String resourceName) {
        return JSON.serializePretty(getTree(resourceName));
    }
    
    /**
     * Adds a file path to the nested map structure
     */
    private static void addPath(Map<String, Object> root, String path) {
        List<String> parts = path.split('/');
        Map<String, Object> current = root;
        
        for (Integer i = 0; i < parts.size(); i++) {
            String part = parts[i];
            Boolean isFile = (i == parts.size() - 1);
            
            if (isFile) {
                current.put(part, path);
            } else {
                if (!current.containsKey(part)) {
                    current.put(part, new Map<String, Object>());
                }
                current = (Map<String, Object>) current.get(part);
            }
        }
    }
    
    /**
     * Navigate using dot notation
     */
    public static Object getPath(Map<String, Object> tree, String dotPath) {
        List<String> parts = dotPath.split('\\.');
        Object current = tree;
        
        for (String part : parts) {
            if (current instanceof Map<String, Object>) {
                current = ((Map<String, Object>) current).get(part);
            } else {
                return null;
            }
        }
        return current;
    }
}