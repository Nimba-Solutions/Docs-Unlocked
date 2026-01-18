"""CumulusCI task to compress a directory path into a zip file."""

import os
import zipfile
from fnmatch import fnmatch
from pathlib import Path

from cumulusci.core.tasks import BaseTask
from cumulusci.core.utils import process_list_arg


class ZipPath(BaseTask):
    """Compress a user-defined path into a .zip file."""

    task_options = {
        "path": {
            "description": "Path to the directory or file to compress",
            "required": True,
        },
        "output": {
            "description": "Output zip file path (defaults to {path}.zip)",
            "required": False,
        },
        "exclude": {
            "description": "List of patterns to exclude from the zip file (supports glob patterns)",
            "required": False,
        },
        "include_meta": {
            "description": "If True, create a .resource-meta.xml file alongside the zip file",
            "required": False,
        },
    }

    def _should_exclude(self, file_path, source_path, exclude_patterns):
        """Check if a file or directory should be excluded based on patterns."""
        if not exclude_patterns:
            return False

        # Get relative path from source
        try:
            rel_path = file_path.relative_to(source_path)
            rel_str = str(rel_path).replace("\\", "/")
        except ValueError:
            # If file_path is not relative to source_path, use absolute path
            rel_str = str(file_path).replace("\\", "/")

        # Check against each exclude pattern
        for pattern in exclude_patterns:
            # Normalize pattern separators
            pattern = pattern.replace("\\", "/")
            # Check if pattern matches
            if fnmatch(rel_str, pattern) or fnmatch(
                str(file_path.name), pattern
            ):
                return True
        return False

    def _get_option_value(self, option_name):
        """Extract option value, handling both direct values and dict structures.
        
        When tasks are loaded from sources, CumulusCI may pass option definitions
        (dicts with description, required, etc.) instead of actual values.
        This method extracts the actual value regardless of how it's structured.
        """
        # Try multiple ways to access the option value
        value = None
        
        # First, try self.options (standard way)
        if hasattr(self, 'options') and option_name in self.options:
            value = self.options[option_name]
        
        # If not found, try task_config.options
        if value is None and hasattr(self, 'task_config') and hasattr(self.task_config, 'options'):
            value = self.task_config.options.get(option_name)
        
        # If value is None or empty, return as-is
        if value is None:
            return None
        
        # If value is already a simple type (str, bool, int, etc.), return it
        if not isinstance(value, dict):
            return value
        
        # Value is a dict - try to extract the actual value
        # This can happen when options come from YAML configurations or sources
        
        # Check if it's the actual value wrapped in a dict
        if "value" in value:
            return value["value"]
        
        # Check for common CumulusCI option definition keys
        # If it has these keys, it's likely a definition dict, not a value
        definition_keys = {"description", "required", "default"}
        if definition_keys.intersection(value.keys()):
            # It's a definition dict - try to get the default
            default = value.get("default")
            if default is not None:
                return default
            # If no default and it's required, this is an error condition
            # But we'll let the caller handle that
        
        # Last resort: if the dict has a single key that's not a definition key,
        # maybe that's the value? Unlikely but possible.
        if len(value) == 1:
            key = list(value.keys())[0]
            if key not in definition_keys:
                return value[key]
        
        # If we can't extract a value, log and return None
        self.logger.warning(
            f"Option '{option_name}' is a dict but doesn't match expected structure. "
            f"Keys: {list(value.keys())}. Value: {value}"
        )
        return None

    def _run_task(self):
        # Get path option, handling dict structures
        path_value = self._get_option_value("path")
        if not path_value:
            raise ValueError("path option is required")
        source_path = Path(path_value).resolve()

        if not source_path.exists():
            raise FileNotFoundError(f"Path does not exist: {source_path}")

        # Determine output zip file path
        output_value = self._get_option_value("output")
        if output_value:
            output_path = Path(output_value).resolve()
        else:
            # If source is a directory, append .zip; if file, replace extension
            if source_path.is_dir():
                output_path = source_path.with_name(f"{source_path.name}.zip")
            else:
                output_path = source_path.with_suffix(".zip")

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Get exclude patterns
        exclude_patterns = []
        exclude_value = self._get_option_value("exclude")
        if exclude_value:
            exclude_patterns = process_list_arg(exclude_value)

        # Create the zip file
        self.logger.info(f"Compressing {source_path} to {output_path}")

        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            if source_path.is_file():
                # If it's a single file, add it directly
                if not self._should_exclude(source_path, source_path.parent, exclude_patterns):
                    zipf.write(source_path, source_path.name)
            else:
                # If it's a directory, add all files recursively
                for root, dirs, files in os.walk(source_path):
                    # Filter out excluded directories before walking into them
                    dirs[:] = [
                        d
                        for d in dirs
                        if not self._should_exclude(
                            Path(root) / d, source_path, exclude_patterns
                        )
                    ]

                    for file in files:
                        file_path = Path(root) / file

                        if not self._should_exclude(file_path, source_path, exclude_patterns):
                            # Calculate relative path for archive
                            arcname = file_path.relative_to(source_path)
                            zipf.write(file_path, arcname)

        self.logger.info(f"Successfully created zip file: {output_path}")

        # Create meta.xml file if requested
        include_meta = self._get_option_value("include_meta")
        if include_meta is None:
            include_meta = False
        # Handle both boolean and string values
        if isinstance(include_meta, str):
            include_meta = include_meta.lower() in ("true", "1", "yes")
        if include_meta:
            meta_content = """<?xml version="1.0" encoding="UTF-8"?>
<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
    <cacheControl>Public</cacheControl>
    <contentType>application/zip</contentType>
</StaticResource>"""
            # Create meta.xml file with same name but .resource-meta.xml extension
            meta_path = output_path.with_suffix(".resource-meta.xml")
            meta_path.write_text(meta_content, encoding="UTF-8")
            self.logger.info(f"Created meta file: {meta_path}")
            self.return_values = {
                "zip_path": str(output_path),
                "meta_path": str(meta_path),
            }
        else:
            self.return_values = {"zip_path": str(output_path)}
