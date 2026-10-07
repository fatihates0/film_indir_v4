import subprocess

with open('public/scripts/gateway_setup.sh', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def test_script(line_list):
    with open('temp_test.sh', 'w', encoding='utf-8') as tf:
        tf.writelines(line_list)
    res = subprocess.run(['wsl', 'bash', '-n', 'temp_test.sh'], capture_output=True, text=True)
    return res.stderr.strip()

print("Original full script WSL error:")
print(test_script(lines))

# Find all functions and remove them one by one to see which removal fixes the error!
func_indices = []
for i, line in enumerate(lines):
    if '() {' in line or line.strip().endswith('() {'):
        func_indices.append(i)

print(f"Testing {len(func_indices)} functions by zeroing them out...")

for idx, f_start in enumerate(func_indices):
    f_end = func_indices[idx+1] if idx+1 < len(func_indices) else len(lines)
    # create copy with this function blanked out
    modified = lines[:f_start] + ['\n'] * (f_end - f_start) + lines[f_end:]
    err = test_script(modified)
    if 'unexpected EOF while looking for matching' not in err:
        print(f"-> REMOVING FUNCTION AT LINE {f_start+1} FIXED THE ERROR! Function header: {lines[f_start].strip()}")
        break
