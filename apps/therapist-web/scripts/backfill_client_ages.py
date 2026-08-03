import requests
from datetime import datetime
BASE='http://127.0.0.1:8000/v1'
THERAPIST_ID='therapist-1'

print('Fetching clients...')
r = requests.get(f"{BASE}/clients?therapist_id={THERAPIST_ID}")
r.raise_for_status()
clients = r.json()

print(f'Found {len(clients)} clients')

def calculate_age(dob_str):
    try:
        # Try ISO format first
        dob = datetime.fromisoformat(dob_str)
    except Exception:
        try:
            dob = datetime.strptime(dob_str, '%Y-%m-%d')
        except Exception:
            return None
    today = datetime.now()
    years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return max(0, years)

updated = []
for c in clients:
    cid = c.get('id')
    dob = c.get('dob')
    age = c.get('age')
    if dob and (age is None or age == 0):
        a = calculate_age(dob)
        if a is None:
            print(f"Could not parse DOB for client {cid}: {dob}")
            continue
        print(f"Updating client {cid}: setting age to {a}")
        rr = requests.patch(f"{BASE}/clients/{cid}", json={"age": a})
        if rr.status_code >= 400:
            print('Failed to update', cid, rr.status_code, rr.text)
        else:
            updated.append((cid, a))

print('Done. Updated count:', len(updated))
for u in updated:
    print(u)
