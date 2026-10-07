with open('public/scripts/gateway_setup.sh', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_heredoc = False
heredoc_tag = ''

for i, line in enumerate(lines, 1):
    strip = line.strip()
    if not in_heredoc:
        if strip.startswith('cat <<'):
            tag = strip.split('<<')[1].split('>')[0].strip().strip("'\"")
            in_heredoc = True
            heredoc_tag = tag
            continue
    else:
        if strip == heredoc_tag:
            in_heredoc = False
            heredoc_tag = ''
        continue

    # Count double quotes on this line
    # Escape \" doesn't count
    temp = line
    # replace escaped quotes
    temp = temp.replace('\\"', '')
    # replace escaped backslashes
    temp = temp.replace('\\\\', '')
    
    dq = temp.count('"')
    if dq % 2 != 0:
        print(f"Line {i}: odd quotes ({dq}): {strip}")
