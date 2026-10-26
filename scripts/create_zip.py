import os
import zipfile
import time

zip_name = 'YuGi-Ultimate-Collection.zip'
print(f"Creating {zip_name}...")
t0 = time.time()

# Files and directories to include
include_files = [
    'index.html',
    'START.bat',
    'START.sh',
    'README_AR.md'
]

include_dirs = [
    'assets',
    'card',
    'data',
    'scripts',
    'tests'
]

count = 0
with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for f in include_files:
        if os.path.exists(f):
            zipf.write(f, arcname=os.path.join('YuGi', f))
            count += 1
            print(f"Added: {f}")
    
    for d in include_dirs:
        for root, dirs, files in os.walk(d):
            for file in files:
                # Skip temporary files
                if file.endswith('.pyc') or file == '__pycache__':
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.join('YuGi', file_path)
                zipf.write(file_path, arcname=arcname)
                count += 1
                if count % 100 == 0:
                    print(f"Packaged {count} files...")

size_mb = os.path.getsize(zip_name) / (1024 * 1024)
duration = time.time() - t0
print("=" * 60)
print(f"Successfully created {zip_name}!")
print(f"Total files packaged: {count}")
print(f"Archive Size: {size_mb:.2f} MB")
print(f"Completed in {duration:.2f} seconds.")
print("=" * 60)
