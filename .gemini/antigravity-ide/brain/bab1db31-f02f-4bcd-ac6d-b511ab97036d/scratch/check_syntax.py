import subprocess

with open('public/scripts/gateway_setup.sh', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Test halves of the file
low = 0
high = len(lines)

def test_lines(sub_lines):
    # wrap in dummy bash shell
    content = "".join(sub_lines)
    p = subprocess.Popen(['bash', '-n'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, err = p.communicate(input=content.encode('utf-8'))
    return err.decode('utf-8', errors='ignore')

# Let's test functions one by one
func_starts = []
for i, line in enumerate(lines):
    if line.strip().endswith('() {') or line.strip().endswith('()'):
        func_starts.append((i, line.strip()))

print(f"Found {len(func_starts)} functions.")

for idx, (line_idx, name) in enumerate(func_starts):
    next_idx = func_starts[idx+1][0] if idx+1 < len(func_starts) else len(lines)
    func_chunk = lines[line_idx:next_idx]
    
    # Test function isolated in a dummy script wrapper
    dummy = "SERVICE_NAME=x\nINSTALL_DIR=x\nENV_FILE=x\n" + "".join(func_chunk)
    p = subprocess.Popen(['bash', '-n'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, err = p.communicate(input=dummy.encode('utf-8'))
    err_str = err.decode('utf-8', errors='ignore').strip()
    if 'unexpected EOF while looking for matching' in err_str or 'syntax error' in err_str:
        print(f"Function starting at line {line_idx+1} ({name}) has syntax error:")
        print(err_str)
