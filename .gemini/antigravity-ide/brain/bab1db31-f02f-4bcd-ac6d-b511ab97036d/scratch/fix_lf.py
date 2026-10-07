import subprocess

with open('public/scripts/gateway_setup.sh', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Test removing each function one by one in LF format
func_starts = []
for i, line in enumerate(lines):
    if line.strip().endswith('() {') or line.strip().endswith('()'):
        func_starts.append((i, line.strip()))

for idx, (f_start, name) in enumerate(func_starts):
    f_end = func_starts[idx+1][0] if idx+1 < len(func_starts) else len(lines)
    # create copy with this function blanked out
    modified_lines = lines[:f_start] + ['\n'] * (f_end - f_start) + lines[f_end:]
    
    with open('temp_lf_test.sh', 'wb') as tf:
        tf.write("".join(modified_lines).encode('utf-8'))
        
    res = subprocess.run(['wsl', 'bash', '-n', 'temp_lf_test.sh'], capture_output=True, text=True)
    err = res.stderr.strip()
    if 'unexpected EOF while looking for matching' not in err:
        print(f"-> REMOVING FUNCTION AT LINE {f_start+1} ({name}) FIXED THE ERROR!")
        print(f"Error without removal was: {err}")
        break
