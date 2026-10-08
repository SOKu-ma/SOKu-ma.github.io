"""Start a loopback-only preview independently of the invoking terminal."""
from pathlib import Path
import socket
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
if not (root / 'dist/apps/index.html').is_file():
    sys.exit('Run npm run build first.')
with socket.socket() as probe:
    if probe.connect_ex(('127.0.0.1', 5190)) == 0:
        sys.exit('Port 5190 is already in use. Existing process was left untouched.')
with (root / '.preview.log').open('ab') as log:
    process = subprocess.Popen(
        [sys.executable, '-m', 'http.server', '5190', '--bind', '127.0.0.1',
         '--directory', str(root / 'dist')],
        stdin=subprocess.DEVNULL, stdout=log, stderr=log,
        cwd=root, start_new_session=True, close_fds=True,
    )
(root / '.preview.pid').write_text(str(process.pid) + '\n')
print(f'Preview PID {process.pid}: http://127.0.0.1:5190/apps/?lang=ja')
print(f'Log: {root / ".preview.log"}')
