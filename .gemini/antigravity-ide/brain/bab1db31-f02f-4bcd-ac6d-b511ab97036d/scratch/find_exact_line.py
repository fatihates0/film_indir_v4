import subprocess

with open('public/scripts/gateway_setup.sh', 'rb') as f:
    raw = f.read().replace(b'\r\n', b'\n')

lines = raw.decode('utf-8').split('\n')

# Divide the script into 10-line chunks and comment them out one by one
# to see which chunk removal fixes the syntax error!

for start in range(0, len(lines), 20):
    end = min(start + 20, len(lines))
    modified = lines[:start] + ['# ' + l for l in lines[start:end]] + lines[end:]
    
    with open('temp_wsl_test.sh', 'wb') as tf:
        tf.write("\n".join(modified).encode('utf-8'))
        
    res = subprocess.run(['wsl', 'bash', '-n', 'temp_wsl_test.sh'], capture_output=True, text=True)
    err = res.stderr.strip()
    if not err:
        print(f"-> COMMENTING OUT LINES {start+1} TO {end} FULLY FIXED THE SYNTAX ERROR!")
        print("Lines in this chunk:")
        for idx in range(start, end):
            print(f"  Line {idx+1}: {lines[idx]}")
        break
