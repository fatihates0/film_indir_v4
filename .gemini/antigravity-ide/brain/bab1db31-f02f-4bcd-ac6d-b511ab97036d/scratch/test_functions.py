import subprocess
import re

with open('public/scripts/gateway_setup.sh', 'rb') as f:
    content = f.read().replace(b'\r\n', b'\n').decode('utf-8')

# Split into functions
# Let's test replacing each function body with 'true'
pattern = r'(\w+\s*\(\)\s*\{)(.*?)(^\})'
matches = list(re.finditer(pattern, content, re.MULTILINE | re.DOTALL))

print(f"Found {len(matches)} top-level functions matching regex.")

for m in matches:
    func_name = m.group(1)
    func_body = m.group(2)
    start_pos = m.start()
    end_pos = m.end()

    # Create modified content replacing body with 'true'
    mod_content = content[:m.start(2)] + "\n  true\n" + content[m.end(2):]

    with open('temp_func_test.sh', 'wb') as tf:
        tf.write(mod_content.encode('utf-8'))

    res = subprocess.run(['wsl', 'bash', '-n', 'temp_func_test.sh'], capture_output=True, text=True)
    if not res.stderr.strip():
        print(f"!!! REPLACING BODY OF FUNCTION '{func_name.strip()}' FULLY FIXED SYNTAX ERROR !!!")
        print(f"Lines {content[:start_pos].count(linesep)+1 if 'linesep' in locals() else 'N/A'}")
        break
    else:
        print(f"Replacing {func_name.strip()} still gave error: {res.stderr.strip()}")
