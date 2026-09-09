from pathlib import Path
import subprocess

candidates = [
    ("v91.82", "ce084665e0630684a0066b44a380f167d2162036"),
    ("v91.81", "28aa8d2b95da4b4ecbd17a66757373f9970aeaac"),
    ("v91.80", "d2496ff0fd525053c90eb34e9d023ee15f540e01"),
    ("v91.79", "1b5619815c926aec752af2c548ba9b1fa33a5670"),
    ("pre-v91.79", "93bf181469e745038249e5a94a77540ac6bca29d"),
    ("v91.78", "8fe2802544d1ce71dd58e13ff4bb4ab84e427b1b"),
    ("v91.77", "b8608fb4ced59e084a73c037a724b3b4ff557404"),
    ("v91.76", "08fea24982223c7d35ea351b532c6eb1ace93107"),
    ("v91.75", "86fb8886bce6aa0b9608f2496611f2a515042dae"),
    ("v91.74", "278cdc782d1fe297671f83da6caf69b20e89aed4"),
]

needle = b"329474 bytes omitted"
lines=[]
for label, sha in candidates:
    try:
        data = subprocess.check_output(["git", "show", f"{sha}:index.html"])
        has = needle in data
        start = data.count(b"<!-- HLGB_V9179_START -->")
        ready = data.count(b"let hlgbRecordReady=false")
        login = data.count(b"function doLogin()")
        lines.append(f"{label}\t{sha}\tbytes={len(data)}\tplaceholder={has}\tv9179_start={start}\thlgbRecordReady={ready}\tdoLogin={login}")
    except subprocess.CalledProcessError as e:
        lines.append(f"{label}\t{sha}\tERROR={e}")
Path("debug/v9183-history.txt").write_text("\n".join(lines)+"\n", encoding="utf-8")
print("\n".join(lines))
