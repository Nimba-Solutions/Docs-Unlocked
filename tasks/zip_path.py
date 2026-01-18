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

    def _run_task(self):
        source_path = Path(self.options["path"]).resolve()

        if not source_path.exists():
            raise FileNotFoundError(f"Path does not exist: {source_path}")

        # Determine output zip file path
        if "output" in self.options and self.options["output"]:
            output_path = Path(self.options["output"]).resolve()
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
        if "exclude" in self.options and self.options["exclude"]:
            exclude_patterns = process_list_arg(self.options["exclude"])

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
        include_meta = self.options.get("include_meta", False)
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
